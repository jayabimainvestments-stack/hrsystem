const db = require('../config/db');

// @desc    Get manual deductions for a specific month
// @route   GET /api/manual-deductions
// @access  Private (Admin/HR)
const getManualDeductions = async (req, res) => {
    const { month } = req.query; // YYYY-MM

    if (!month) {
        return res.status(400).json({ message: 'Month is required' });
    }

    try {
        // 1. Get current policy rates for calculation
        const policyRes = await db.query('SELECT absent_day_amount, late_hourly_rate, absent_deduction_rate FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];
        const dayRate = parseFloat(policy ? policy.absent_day_amount : 0);
        const hourRate = parseFloat(policy ? policy.late_hourly_rate : 0);
        const multiplier = parseFloat(policy ? policy.absent_deduction_rate : 1);

        // Fetch all active employees and join with their deductions for the month
        // Also aggregate attendance data for auto-calculation
        const result = await db.query(`
            SELECT 
                e.id as employee_id, 
                COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                u.name as employee_name,
                ad.id as deduction_id,
                -- Use existing saved value if present, otherwise use calculated auto-value
                COALESCE(ad.deduct_days, calc.absent_days, 0) as deduct_days,
                COALESCE(ad.deduct_hours, calc.late_hours, 0) as deduct_hours,
                -- Dynamic Rates
                CASE WHEN $2 > 0 THEN $2 ELSE (COALESCE(sal.basic_salary, 0) / 30.0) * $4 END as effective_day_rate,
                CASE WHEN $3 > 0 THEN $3 ELSE (COALESCE(sal.basic_salary, 0) / 240.0) END as effective_hour_rate,
                -- Use saved amount or calculate based on policy
                COALESCE(ad.total_amount, 
                        (COALESCE(calc.absent_days, 0) * (CASE WHEN $2 > 0 THEN $2 ELSE (COALESCE(sal.basic_salary, 0) / 30.0) * $4 END)) + 
                        (COALESCE(calc.late_hours, 0) * (CASE WHEN $3 > 0 THEN $3 ELSE (COALESCE(sal.basic_salary, 0) / 240.0) END))
                ) as total_amount,
                COALESCE(ad.status, 'Pending') as status,
                ad.created_by,
                ad.approved_by_1,
                -- Return calculated values for reference
                COALESCE(calc.absent_days, 0) as calc_absent_days,
                COALESCE(calc.late_hours, 0) as calc_late_hours
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN attendance_deductions ad ON e.id = ad.employee_id AND ad.month = $1
            LEFT JOIN (
                SELECT ess.employee_id, ess.amount as basic_salary
                FROM employee_salary_structure ess
                JOIN salary_components sc ON ess.component_id = sc.id
                WHERE sc.name ILIKE '%basic%'
            ) sal ON e.id = sal.employee_id
            LEFT JOIN (
                SELECT 
                    e.id as employee_id,
                    (COALESCE(att.absent_days, 0) + COALESCE(l.unpaid_days, 0)) as absent_days,
                    (COALESCE(att.late_hours, 0) + COALESCE(l.short_leave_hours, 0)) as late_hours
                FROM employees e
                LEFT JOIN (
                    SELECT employee_id, 
                           (COUNT(*) FILTER (WHERE status = 'Absent')) + (COUNT(*) FILTER (WHERE status = 'Incomplete' AND date < CURRENT_DATE) * 0.5) as absent_days,
                           ROUND(SUM(COALESCE(late_minutes, 0)) / 60.0 + SUM(CASE WHEN date < CURRENT_DATE THEN COALESCE(short_leave_hours, 0) ELSE 0 END), 2) as late_hours
                    FROM attendance 
                    WHERE to_char(date, 'YYYY-MM') = $1
                    GROUP BY employee_id
                ) att ON e.id = att.employee_id
                LEFT JOIN (
                    SELECT user_id,
                           SUM(unpaid_days) as unpaid_days,
                           SUM(short_leave_hours) as short_leave_hours
                    FROM leaves
                    WHERE status = 'Approved' AND to_char(start_date, 'YYYY-MM') = $1
                    GROUP BY user_id
                ) l ON e.user_id = l.user_id
            ) calc ON e.id = calc.employee_id
            WHERE e.employment_status = 'Active' OR e.employment_status IS NULL
            ORDER BY u.name
        `, [month, dayRate, hourRate, multiplier]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save/Update manual deduction entry
// @route   POST /api/manual-deductions
// @access  Private (Admin/HR)
const saveManualDeduction = async (req, res) => {
    const { employee_id, month, deduct_days, deduct_hours, reason } = req.body;

    if (!employee_id || !month) {
        return res.status(400).json({ message: 'Employee and Month are required' });
    }

    try {
        // 1. Get current policy rates for calculation
        const policyRes = await db.query('SELECT absent_day_amount, late_hourly_rate, absent_deduction_rate FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];

        // Fetch basic salary for multiplier fallback
        const salaryRes = await db.query(`
            SELECT ess.amount 
            FROM employee_salary_structure ess
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE ess.employee_id = $1 AND sc.name ILIKE '%basic%'
            LIMIT 1
        `, [employee_id]);

        const basicSalary = salaryRes.rows.length > 0 ? parseFloat(salaryRes.rows[0].amount) : 0;

        const dayRate = policy?.absent_day_amount > 0
            ? parseFloat(policy.absent_day_amount)
            : (basicSalary / 30) * parseFloat(policy?.absent_deduction_rate || 1);

        const hourRate = policy?.late_hourly_rate > 0
            ? parseFloat(policy.late_hourly_rate)
            : (basicSalary / 240);

        const totalAmount = (parseFloat(deduct_days || 0) * dayRate) + (parseFloat(deduct_hours || 0) * hourRate);

        // 2. Check if entry exists
        const checkRes = await db.query(
            'SELECT id, status FROM attendance_deductions WHERE employee_id = $1 AND month = $2',
            [employee_id, month]
        );

        if (checkRes.rows.length > 0) {
            const existing = checkRes.rows[0];
            // Prevent editing if fully approved or processed (optional - based on req "unchangeable after approval")
            // For now, allow editing if not 'Processed'
            if (existing.status === 'Processed') {
                return res.status(400).json({ message: 'Cannot edit processed deduction' });
            }

            const newStatus = totalAmount === 0 ? 'Processed' : 'Pending';

            // Update
            const updateRes = await db.query(`
                UPDATE attendance_deductions 
                SET deduct_days = $1, deduct_day_rate = $2, 
                    deduct_hours = $3, deduct_hour_rate = $4, 
                    total_amount = $5, reason = $6, updated_at = NOW(),
                    status = $8, approved_by_1 = CASE WHEN $8 = 'Processed' THEN $9 ELSE NULL END, 
                    approved_by_2 = NULL, 
                    approved_at_1 = CASE WHEN $8 = 'Processed' THEN NOW() ELSE NULL END, 
                    approved_at_2 = NULL
                WHERE id = $7
                RETURNING *
            `, [deduct_days, dayRate, deduct_hours, hourRate, totalAmount, reason, existing.id, newStatus, req.user.id]);

            res.status(200).json(updateRes.rows[0]);
        } else {
            const newStatus = totalAmount === 0 ? 'Processed' : 'Pending';

            // Insert
            const insertRes = await db.query(`
                INSERT INTO attendance_deductions 
                (employee_id, month, deduct_days, deduct_day_rate, deduct_hours, deduct_hour_rate, total_amount, reason, status, created_by, approved_by_1, approved_at_1)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $9 = 'Processed' THEN $10 ELSE NULL END, CASE WHEN $9 = 'Processed' THEN NOW() ELSE NULL END)
                RETURNING *
            `, [employee_id, month, deduct_days, dayRate, deduct_hours, hourRate, totalAmount, reason, newStatus, req.user.id]);

            res.status(201).json(insertRes.rows[0]);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve deduction (Final Approval)
// @route   POST /api/manual-deductions/:id/approve
// @access  Private (HR Manager)
const approveDeduction = async (req, res) => {
    const { id } = req.params;

    try {
        const deductionRes = await db.query('SELECT * FROM attendance_deductions WHERE id = $1', [id]);
        if (deductionRes.rows.length === 0) return res.status(404).json({ message: 'Deduction not found' });

        const deduction = deductionRes.rows[0];

        if (deduction.status === 'Processed') {
            return res.status(400).json({ message: 'Deduction already processed' });
        }

        // Segregation of Duties: Creator cannot approve
        // Assuming created_by is populated. If null (legacy), we might allow or warning.
        if (deduction.created_by && deduction.created_by === req.user.id) {
            return res.status(403).json({ message: 'You cannot approve your own entry. Another HR Manager must approve this.' });
        }

        // Approve and Process immediately
        await db.query(`
            UPDATE attendance_deductions 
            SET status = 'Processed', approved_by_1 = $1, approved_at_1 = NOW(), updated_at = NOW()
            WHERE id = $2
        `, [req.user.id, id]);

        // Push to Manual Override (No Pay)
        await processToSalaryStructure(deduction.employee_id, deduction.total_amount, deduction.month);

        res.status(200).json({ message: 'Approved and Processed to Monthly Overrides' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Helper to push to Monthly Overrides "No Pay"
async function processToSalaryStructure(employeeId, amount, month) {
    // 1. Find "No Pay" component
    const compRes = await db.query("SELECT id FROM salary_components WHERE name = 'No Pay'");
    let deductionComponentId;

    if (compRes.rows.length === 0) {
        const newComp = await db.query(
            "INSERT INTO salary_components (name, type, is_taxable) VALUES ('No Pay', 'Deduction', true) RETURNING id"
        );
        deductionComponentId = newComp.rows[0].id;
    } else {
        deductionComponentId = compRes.rows[0].id;
    }

    // 2. Upsert into monthly_salary_overrides
    await db.query(`
        INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, reason)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (employee_id, month, component_id)
        DO UPDATE SET amount = EXCLUDED.amount, reason = EXCLUDED.reason
    `, [employeeId, month, deductionComponentId, amount, 'Attendance/Manual Deduction']);
}

// @desc    Get status of total deductions for the month
// @route   GET /api/manual-deductions/status
const getDeductionMonthStatus = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const countRes = await db.query('SELECT COUNT(*) as total FROM employees WHERE employment_status = \'Active\'');
        const processedRes = await db.query('SELECT COUNT(*) as processed FROM attendance_deductions WHERE month = $1 AND status = \'Processed\'', [month]);

        const total = parseInt(countRes.rows[0].total);
        const processed = parseInt(processedRes.rows[0].processed);

        res.status(200).json({
            exists: processed > 0,
            transferred: processed >= total && total > 0,
            status: processed >= total ? 'Processed' : (processed > 0 ? 'Partial' : 'Pending'),
            processed_count: processed,
            total_count: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ignore deduction (Mark as skipped)
// @route   POST /api/manual-deductions/ignore
// @access  Private (Admin/HR)
const ignoreDeduction = async (req, res) => {
    const { employee_id, month } = req.body;

    if (!employee_id || !month) {
        return res.status(400).json({ message: 'Employee and Month are required' });
    }

    try {
        // Check if entry exists
        const checkRes = await db.query(
            'SELECT id, status, total_amount FROM attendance_deductions WHERE employee_id = $1 AND month = $2',
            [employee_id, month]
        );

        if (checkRes.rows.length > 0) {
            const existing = checkRes.rows[0];
            if (existing.status === 'Processed') {
                return res.status(400).json({ message: 'Cannot ignore processed deduction' });
            }

            if (existing.status === 'Ignored') {
                // Restore logic
                if (parseFloat(existing.total_amount) === 0) {
                    // It was a placeholder just to ignore the auto-calculation. Delete it to revert to auto-calculate.
                    await db.query("DELETE FROM attendance_deductions WHERE id = $1", [existing.id]);
                    return res.status(200).json({ message: 'Deduction restored to auto-calculation' });
                } else {
                    // It was a previously saved deduction, restore it to Pending
                    await db.query("UPDATE attendance_deductions SET status = 'Pending', updated_at = NOW() WHERE id = $1", [existing.id]);
                    return res.status(200).json({ message: 'Deduction restored to pending' });
                }
            } else {
                // Ignore logic
                await db.query(
                    "UPDATE attendance_deductions SET status = 'Ignored', updated_at = NOW() WHERE id = $1",
                    [existing.id]
                );
                return res.status(200).json({ message: 'Deduction ignored' });
            }
        } else {
            // Create Ignored record with 0 amounts
            await db.query(`
                INSERT INTO attendance_deductions 
                (employee_id, month, deduct_days, deduct_day_rate, deduct_hours, deduct_hour_rate, total_amount, reason, status, created_by)
                VALUES ($1, $2, 0, 0, 0, 0, 0, 'Ignored by User', 'Ignored', $3)
            `, [employee_id, month, req.user.id]);
            return res.status(200).json({ message: 'Deduction ignored' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getManualDeductions,
    saveManualDeduction,
    approveDeduction,
    getDeductionMonthStatus,
    ignoreDeduction
};
