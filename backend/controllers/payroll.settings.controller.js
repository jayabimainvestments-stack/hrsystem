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

            // Identify DELETED components (components that exist in DB but not in the submitted array)
            const submittedComponentIds = components.map(c => parseInt(c.component_id));
            const existingRes = await db.query('SELECT component_id, amount, quantity, installments_remaining FROM employee_salary_structure WHERE employee_id = $1 AND is_locked = false', [employee_id]);
            
            for (const existing of existingRes.rows) {
                if (!submittedComponentIds.includes(parseInt(existing.component_id))) {
                    changedComponents.push({
                        component_id: existing.component_id,
                        action: 'DELETE',
                        amount: 0,
                        quantity: 0,
                        installments_remaining: null,
                        old_values: existing
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

const deleteAllMonthlyOverrides = async (req, res) => {
    try {
        await db.query('DELETE FROM monthly_salary_overrides');
        res.status(200).json({ message: 'All monthly overrides removed' });
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
    // 0. Determine target month (Allow override via query)
    const currentMonth = req.query.month || new Date().toISOString().slice(0, 7); 

    try {
        // 0. Fetch latest fuel price for dynamic calculation
        const fuelPriceRes = await db.query("SELECT price_per_liter FROM fuel_price_history ORDER BY effective_from_date DESC LIMIT 1");
        const latestFuelPrice = fuelPriceRes.rows.length > 0 ? parseFloat(fuelPriceRes.rows[0].price_per_liter) : 370.00;

        // 1. Get all employees with their permanent salary structure components
        const result = await db.query(`
            SELECT 
                e.id, 
                e.employee_id as emp_code, 
                COALESCE(u.name, u.email, 'Employee ' || e.employee_id) as name, 
                e.designation,
                e.department,
                e.employment_status,
                sc.id as component_id,
                sc.name as component_name,
                sc.type as component_type,
                es.amount as permanent_amount,
                es.quantity,
                es.installments_remaining,
                sc.epf_eligible,
                sc.etf_eligible
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN employee_salary_structure es ON e.id = es.employee_id
            LEFT JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.employment_status = 'Active'
            ORDER BY e.id, sc.type DESC, sc.name ASC
        `);

        // 2. Get monthly overrides for current month (to check pending/approved)
        const overridesRes = await db.query(`
            SELECT mo.employee_id, mo.component_id, mo.amount, mo.quantity, mo.status, mo.reason, sc.name as component_name
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.month = $1
        `, [currentMonth]);
        const overrideMap = {}; // key: `${emp_id}_${comp_id}`
        for (const ov of overridesRes.rows) {
            overrideMap[`${ov.employee_id}_${ov.component_id}`] = ov;
        }

        // 3. Get payroll records for current month (to know if payroll was processed)
        const payrollRes = await db.query(`
            SELECT p.user_id, e.id as emp_id
            FROM payroll p
            JOIN employees e ON p.user_id = e.user_id
            WHERE p.month = $1
        `, [currentMonth]);
        const processedEmpIds = new Set(payrollRes.rows.map(r => r.emp_id));

        // 4. Get manual deductions (financial_requests) pending/approved for current month
        const manualRes = await db.query(`
            SELECT 
                (elem->>'employee_id')::int as employee_id,
                fr.type as component_name,
                (elem->>'amount')::decimal as amount,
                fr.status,
                fr.month,
                (elem->>'reason') as status_detail
            FROM financial_requests fr,
            jsonb_array_elements(fr.data) elem
            WHERE fr.month = $1
        `, [currentMonth]).catch(() => ({ rows: [] }));

        // 5. Group rows by employee
        const empMap = {};
        for (const row of result.rows) {
            if (!empMap[row.id]) {
                empMap[row.id] = {
                    id: row.id,
                    emp_code: row.emp_code,
                    name: row.name,
                    designation: row.designation,
                    payroll_processed: processedEmpIds.has(row.id),
                    components: []
                };
            }

            if (row.component_id) {
                const override = overrideMap[`${row.id}_${row.component_id}`];
                let status = 'Confirmed'; // in salary structure
                let statusDetail = 'From permanent salary structure';
                
                // Dynamic Fuel Calculation: Liters * Latest Price
                let displayAmount = parseFloat(row.permanent_amount) || 0;
                if (row.component_name && row.component_name.toLowerCase().includes('fuel') && parseFloat(row.quantity) > 0) {
                    displayAmount = parseFloat(row.quantity) * latestFuelPrice;
                }

                if (override) {
                    if (override.status === 'Pending' || override.status === 'Draft') {
                        status = 'Pending Approval';
                        statusDetail = `Override pending: LKR ${parseFloat(override.amount).toLocaleString()} (${override.reason || 'No reason'})`;
                        displayAmount = parseFloat(override.amount) || displayAmount;
                    } else if (override.status === 'Approved') {
                        status = 'Override Applied';
                        statusDetail = `Monthly override approved: LKR ${parseFloat(override.amount).toLocaleString()}`;
                        displayAmount = parseFloat(override.amount) || displayAmount;
                    } else if (override.status === 'Rejected') {
                        // Skip overrides that are rejected
                        continue; 
                    }
                }

                if (!processedEmpIds.has(row.id)) {
                    if (status === 'Confirmed') status = 'Not Processed';
                }

                empMap[row.id].components.push({
                    id: row.component_id, // Standardized: use 'id'
                    name: row.component_name,
                    type: row.component_type,
                    amount: displayAmount,
                    quantity: parseFloat(row.quantity) || 0,
                    installments_remaining: row.installments_remaining,
                    status,
                    status_detail: statusDetail,
                    epf_eligible: row.epf_eligible,
                    etf_eligible: row.etf_eligible
                });
            }
        }
        
        // 5.5 Merge Standalone Overrides (not in permanent structure)
        for (const ov of Object.values(overrideMap)) {
            const emp = empMap[ov.employee_id];
            if (!emp) continue;

            // Check if already added via permanent loop (by ID or Name similarity for Fuel)
            const isAlreadyIncluded = emp.components.some(c => 
                c.id === ov.component_id || 
                (ov.component_name.toLowerCase().includes('fuel') && (c.name || '').toLowerCase().includes('fuel'))
            );

            if (isAlreadyIncluded) continue; // FIX: Skip if already handled in the first loop
            
            if (ov.status === 'Rejected') continue; // Skip rejected overrides

                const isApplied = processedEmpIds.has(ov.employee_id);
                emp.components.push({
                    id: ov.component_id,
                    name: ov.component_name || 'Variable component',
                    type: (ov.component_name || '').toLowerCase().includes('deduction') ? 'Deduction' : 'Earning',
                    amount: parseFloat(ov.amount) || 0,
                    quantity: parseFloat(ov.quantity) || 0,
                    status: isApplied ? 'Confirmed' : (ov.status === 'Approved' ? 'Approved – Not Yet Processed' : 'Pending Approval'),
                    status_detail: `Monthly Governance: ${ov.status} (${ov.reason || 'No details'})`
                });
        }

        // 6. Append manual/financial requests as separate pending items
        for (const manual of manualRes.rows) {
            const emp = empMap[manual.employee_id];
            if (!emp) continue;
            
            // Check if already added (by Name similarity for Fuel/Loan/Advance)
            const isAlreadyIncluded = emp.components.some(c => 
                c.name.toLowerCase().includes(manual.component_name.toLowerCase()) ||
                (manual.component_name.toLowerCase().includes('fuel') && c.name.toLowerCase().includes('fuel'))
            );

            if (!isAlreadyIncluded && manual.status !== 'Rejected') {
                const isApplied = processedEmpIds.has(manual.employee_id);
                const isDeduction = manual.component_name.toLowerCase().includes('advance') || 
                                    manual.component_name.toLowerCase().includes('loan') || 
                                    manual.component_name.toLowerCase().includes('deduction');
                
                // Final safeguard: Match types properly
                const type = (manual.component_name.toLowerCase().includes('deduction') || isDeduction) ? 'Deduction' : 'Earning';

                emp.components.push({
                    id: null,
                    name: manual.component_name,
                    type: type,
                    amount: parseFloat(manual.amount) || 0,
                    quantity: 0,
                    status: isApplied ? 'Confirmed' : (manual.status === 'Approved' ? 'Approved – Not Yet Processed' : 'Pending Approval'),
                    status_detail: manual.status_detail || `Financial request status: ${manual.status}`
                });
            }
        }

        res.status(200).json({ month: currentMonth, employees: Object.values(empMap).map(emp => {
            const earnings = emp.components.filter(c => c.type === 'Earning' && c.status !== 'Rejected').reduce((s, c) => s + c.amount, 0);
            const deductions = emp.components.filter(c => c.type === 'Deduction' && c.status !== 'Rejected').reduce((s, c) => s + c.amount, 0);
            return { ...emp, total_earnings: earnings, total_deductions: deductions };
        })});
    } catch (error) {
        console.error('[BASELINE_ERROR]', error);
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
    getConsolidatedBaseline
};
