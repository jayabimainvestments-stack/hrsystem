const db = require('../config/db');

// --- SALARY COMPONENTS ---

const getComponents = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM salary_components ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createComponent = async (req, res) => {
    const { name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible } = req.body;
    try {
        // 1. Check for duplicate name (case-insensitive)
        const checkRes = await db.query(
            'SELECT id FROM salary_components WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
            [name]
        );

        if (checkRes.rows.length > 0) {
            return res.status(400).json({ message: `A salary component with the name "${name}" already exists.` });
        }

        const result = await db.query(
            'INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateComponent = async (req, res) => {
    const { name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, status } = req.body;
    try {
        const result = await db.query(
            `UPDATE salary_components 
             SET name = COALESCE($1, name), type = COALESCE($2, type), 
                 is_taxable = COALESCE($3, is_taxable), 
                 epf_eligible = COALESCE($4, epf_eligible),
                 etf_eligible = COALESCE($5, etf_eligible),
                 welfare_eligible = COALESCE($6, welfare_eligible),
                 status = COALESCE($7, status)
             WHERE id = $8 RETURNING *`,
            [name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, status, req.params.id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- TAX BRACKETS ---

const getTaxBrackets = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tax_brackets ORDER BY min_income');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTaxBracket = async (req, res) => {
    const { min_income, max_income, tax_rate } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO tax_brackets (min_income, max_income, tax_rate) VALUES ($1, $2, $3) RETURNING *',
            [min_income, max_income, tax_rate]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTaxBracket = async (req, res) => {
    try {
        await db.query('DELETE FROM tax_brackets WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Tax bracket deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- EMPLOYEE SALARY STRUCTURE ---

const getEmployeeStructure = async (req, res) => {
    const { employeeId } = req.params;

    try {
        // 1. Permanent baseline from employee_salary_structure
        const structureRes = await db.query(`
            SELECT 
                es.component_id, 
                es.amount, 
                es.quantity, 
                es.installments_remaining, 
                es.is_locked, 
                es.lock_reason, 
                sc.name, 
                sc.type
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
            ORDER BY sc.type DESC, sc.name ASC
        `, [employeeId]);

        const structure = structureRes.rows.map(r => ({ ...r, is_permanent: true }));
        const permanentIds = new Set(structure.map(s => s.component_id));

        // 2. Also fetch current month approved monthly_salary_overrides
        // (Salary Advance, Fuel Allowance etc. that were approved through Governance)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyRes = await db.query(`
            SELECT 
                mo.component_id,
                mo.amount,
                mo.quantity,
                mo.reason,
                sc.name,
                sc.type
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1
              AND mo.month = $2
              AND mo.status = 'Approved'
        `, [employeeId, currentMonth]);

        // 3. Merge: If a monthly override exists, it MUST overwrite the permanent structure's amount for this month
        // Find existing ones to update
        for (const mo of monthlyRes.rows) {
            if (permanentIds.has(mo.component_id)) {
                // Update the existing permanent item with the monthly overridden amount
                const target = structure.find(s => s.component_id === mo.component_id);
                if (target) {
                    target.amount = mo.amount;
                    target.quantity = mo.quantity;
                    target.is_monthly_only = true;
                    target.lock_reason = mo.reason || 'Monthly override applied over baseline';
                }
            } else {
                // Add new monthly-only items
                structure.push({
                    ...mo,
                    installments_remaining: null,
                    is_locked: true,
                    lock_reason: mo.reason || 'Monthly override — approved via Governance',
                    is_permanent: false,
                    is_monthly_only: true  // flag for frontend display
                });
            }
        }

        res.status(200).json(structure);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const updateEmployeeStructure = async (req, res) => {
    const { employee_id, components, reason } = req.body;
    // Maker-Checker applies to any staff with HR/Admin privileges
    const isMaker = ['Admin', 'HR Manager', 'HR Officer'].includes(req.user.role);
    const isAdmin = req.user.role === 'Admin';

    try {
        if (isMaker) {
            // Maker-Checker flow: All roles go through Governance approval
            const changedComponents = [];

            for (const comp of components) {
                const currentRes = await db.query(
                    'SELECT amount, quantity, installments_remaining FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [employee_id, comp.component_id]
                );

                const current = currentRes.rows[0] || { amount: 0, quantity: 0, installments_remaining: null };
                const isChanged =
                    parseFloat(comp.amount || 0) !== parseFloat(current.amount || 0) ||
                    parseFloat(comp.quantity || 0) !== parseFloat(current.quantity || 0) ||
                    comp.installments_remaining !== current.installments_remaining;

                if (isChanged) {
                    // SEC-GUARD: Prevent Salary Advance from being saved to permanent structure
                    const compInfo = await db.query('SELECT name FROM salary_components WHERE id = $1', [comp.component_id]);
                    if (compInfo.rows.length > 0 && compInfo.rows[0].name.toLowerCase().includes('advance')) {
                        console.warn(`[PAYROLL_SETTINGS] Blocked permanent update for advance component: ${compInfo.rows[0].name}`);
                        continue; // Skip this component for permanent update
                    }

                    changedComponents.push({
                        component_id: comp.component_id,
                        amount: comp.amount || 0,
                        quantity: comp.quantity || 0,
                        installments_remaining: comp.installments_remaining || null,
                        old_values: current
                    });
                }
            }

            if (changedComponents.length > 0) {
                await db.query(
                    `INSERT INTO pending_changes (entity, entity_id, field_name, new_value, requested_by, reason, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        'employee_salary_structure',
                        employee_id,
                        'MULTIPLE_COMPONENTS',
                        JSON.stringify(changedComponents),
                        req.user.id,
                        reason || 'Salary modification',
                        'Pending'
                    ]
                );
                return res.status(200).json({ message: 'Salary modifications submitted for approval. Please check Governance Hub → Pending Actions.' });
            } else {
                // No actual changes detected — all submitted values match current DB values
                return res.status(200).json({ message: 'No changes detected. The submitted values are identical to the current salary structure.' });
            }
        }

        // Direct update path (Admin, or Maker just assigning components with no changes, or Checker applying approved changes)
        await db.query('BEGIN');

        for (const comp of components) {
            // SEC-GUARD: Prevent Salary Advance from being saved to permanent structure
            const compInfo = await db.query('SELECT name FROM salary_components WHERE id = $1', [comp.component_id]);
            if (compInfo.rows.length > 0 && compInfo.rows[0].name.toLowerCase().includes('advance')) {
                continue; // Skip
            }

            const check = await db.query('SELECT is_locked FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2', [employee_id, comp.component_id]);

            if (check.rows.length > 0) {
                if (!check.rows[0].is_locked || isAdmin) {
                    await db.query(
                        'UPDATE employee_salary_structure SET amount = $1, quantity = $2, installments_remaining = $3 WHERE employee_id = $4 AND component_id = $5',
                        [comp.amount || 0, comp.quantity || 0, comp.installments_remaining || null, employee_id, comp.component_id]
                    );
                }
            } else {
                await db.query(
                    'INSERT INTO employee_salary_structure (employee_id, component_id, amount, quantity, installments_remaining) VALUES ($1, $2, $3, $4, $5)',
                    [employee_id, comp.component_id, comp.amount || 0, comp.quantity || 0, comp.installments_remaining || null]
                );
            }
        }

        const currentIds = components.map(c => c.component_id);
        if (currentIds.length > 0) {
            // Optional: logic to remove others? skipping for safety to avoid data loss
        }

        await db.query('COMMIT');
        res.status(200).json({ message: 'Structure updated successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    }
};


const getFuelQuotas = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                e.id as id, 
                e.employee_id as string_id, 
                u.name, 
                e.designation,
                es.quantity 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            JOIN employee_salary_structure es ON e.id = es.employee_id 
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.employment_status = 'Active'
                AND sc.name ILIKE '%fuel%'
            ORDER BY u.name
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAllEmployeeStructures = async (req, res) => {
    try {
        await db.query('DELETE FROM employee_salary_structure');
        res.status(200).json({ message: 'All structures deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const snapshotBaseline = async (req, res) => {
    const { employeeId, month } = req.body;
    if (!employeeId || !month) return res.status(400).json({ message: 'Employee ID and Month are required' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Permanent Structure
        const structRes = await client.query(`
            SELECT component_id, amount, quantity, installments_remaining 
            FROM employee_salary_structure 
            WHERE employee_id = $1
        `, [employeeId]);

        if (structRes.rows.length === 0) {
            throw new Error('No permanent structure found for this employee.');
        }

        // 2. Transfer each to Monthly Overrides (Draft)
        for (const comp of structRes.rows) {
            // Upsert: If exists for this month/component, update. Else insert as Draft.
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, status, reason)
                VALUES ($1, $2, $3, $4, $5, 'Draft', 'Master Baseline Snapshot')
                ON CONFLICT (employee_id, month, component_id) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    quantity = EXCLUDED.quantity,
                    status = 'Draft' 
            `, [employeeId, month, comp.component_id, comp.amount, comp.quantity]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: `Successfully snapshotted ${structRes.rows.length} components to ${month} as Draft.` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

const approveMonthlyOverride = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE monthly_salary_overrides SET status = \'Approved\' WHERE id = $1', [id]);
        res.status(200).json({ message: 'Override approved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const bulkApproveOverrides = async (req, res) => {
    const { employeeId, month } = req.body;
    try {
        await db.query('UPDATE monthly_salary_overrides SET status = \'Approved\' WHERE employee_id = $1 AND month = $2', [employeeId, month]);
        res.status(200).json({ message: 'All overrides approved for this month' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteMonthlyOverride = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM monthly_salary_overrides WHERE id = $1', [id]);
        res.status(200).json({ message: 'Override removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMonthlyOverrides = async (req, res) => {
    const { employee_id, month, components, reason } = req.body;
    if (!employee_id || !month || !components) return res.status(400).json({ message: 'Missing required fields' });

    try {
        await db.query('BEGIN');
        for (const comp of components) {
            await db.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, status, reason)
                VALUES ($1, $2, $3, $4, $5, 'Draft', $6)
                ON CONFLICT (employee_id, month, component_id) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    quantity = EXCLUDED.quantity,
                    status = 'Draft',
                    reason = EXCLUDED.reason
            `, [employee_id, month, comp.component_id, comp.amount || 0, comp.quantity || 0, reason || 'Manual Correction']);
        }
        await db.query('COMMIT');
        res.status(200).json({ message: 'Monthly overrides updated. Status set to Draft for review.' });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    }
};

const getConsolidatedBaseline = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                e.id, 
                e.employee_id as emp_code, 
                u.name, 
                e.designation,
                SUM(CASE WHEN sc.type = 'Earning' THEN es.amount ELSE 0 END) as total_earnings,
                SUM(CASE WHEN sc.type = 'Deduction' THEN es.amount ELSE 0 END) as total_deductions
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN employee_salary_structure es ON e.id = es.employee_id
            LEFT JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.employment_status = 'Active'
            GROUP BY e.id, u.name, e.employee_id, e.designation
            ORDER BY u.name
        `);
        
        // Also check for pending baseline sync for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const syncStatus = await db.query(
            "SELECT status FROM pending_changes WHERE entity = 'MASTER_BASELINE_SYNC' AND field_name = $1 ORDER BY created_at DESC LIMIT 1",
            [currentMonth]
        );

        res.status(200).json({
            employees: result.rows,
            syncStatus: syncStatus.rows[0]?.status || 'Draft'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const submitMasterBaseline = async (req, res) => {
    const { month, reason } = req.body;
    try {
        const check = await db.query(
            "SELECT id FROM pending_changes WHERE entity = 'MASTER_BASELINE_SYNC' AND field_name = $1 AND status = 'Pending'",
            [month]
        );
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'A baseline sync request is already pending for this month.' });
        }

        await db.query(
            `INSERT INTO pending_changes (entity, field_name, new_value, requested_by, reason, status)
             VALUES ($1, $2, $3, $4, $5, 'Pending')`,
            ['MASTER_BASELINE_SYNC', month, 'FINALIZED', req.user.id, reason || `Master Baseline Sync for ${month}`, 'Pending']
        );
        res.status(200).json({ message: 'Master Baseline submitted for Governance approval.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getComponents,
    createComponent,
    updateComponent,
    getTaxBrackets,
    createTaxBracket,
    deleteTaxBracket,
    getEmployeeStructure,
    updateEmployeeStructure,
    getFuelQuotas,
    deleteAllEmployeeStructures,
    snapshotBaseline,
    updateMonthlyOverrides,
    approveMonthlyOverride,
    bulkApproveOverrides,
    deleteMonthlyOverride,
    deleteAllMonthlyOverrides,
    getConsolidatedBaseline,
    submitMasterBaseline
};
