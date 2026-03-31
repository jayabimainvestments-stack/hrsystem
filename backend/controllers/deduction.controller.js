const db = require('../config/db');

// Calculate and push deductions
const calculateDeductions = async (req, res) => {
    const { month } = req.body;  // Expected format 'YYYY-MM'

    if (!month) {
        return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Policy Rates
        const policyRes = await client.query('SELECT absent_day_amount, late_hourly_rate, absent_deduction_rate, work_start_time FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];
        const absentRate = parseFloat(policy.absent_day_amount || 0);
        const lateRate = parseFloat(policy.late_hourly_rate || 0);
        const policyMultiplier = parseFloat(policy.absent_deduction_rate || 1);

        // 2. Identify the "No Pay" Component ID
        const compRes = await client.query("SELECT id FROM salary_components WHERE name = 'No Pay'");
        let deductionComponentId;
        if (compRes.rows.length === 0) {
            // Create if missing
            const newComp = await client.query(
                "INSERT INTO salary_components (name, type, is_taxable) VALUES ('No Pay', 'Deduction', true) RETURNING id"
            );
            deductionComponentId = newComp.rows[0].id;
        } else {
            deductionComponentId = compRes.rows[0].id;
        }

        // Identify "Attendance Allowance" Component ID
        const attAllowRes = await client.query("SELECT id, default_value FROM salary_components WHERE name = 'Attendance Allowance'");
        let attAllowanceId;
        let attAllowanceDefault = 0;

        if (attAllowRes.rows.length === 0) {
            // Create if missing - User requested it
            const newComp = await client.query(
                "INSERT INTO salary_components (name, type, is_taxable, default_value) VALUES ('Attendance Allowance', 'Earning', true, '0') RETURNING id"
            );
            attAllowanceId = newComp.rows[0].id;
        } else {
            attAllowanceId = attAllowRes.rows[0].id;
            attAllowanceDefault = parseFloat(attAllowRes.rows[0].default_value || 0);
        }

        // 3. Get all active employees with their basic salary for multiplier fallback
        const empRes = await client.query(`
            SELECT e.id, e.name, sal.basic_salary 
            FROM employees e
            LEFT JOIN (
                SELECT ess.employee_id, ess.amount as basic_salary
                FROM employee_salary_structure ess
                JOIN salary_components sc ON ess.component_id = sc.id
                WHERE sc.name ILIKE '%basic%'
            ) sal ON e.id = sal.employee_id
            WHERE e.employment_status = 'Active'
        `);
        const employees = empRes.rows;

        let processedCount = 0;
        let totalDeductionValue = 0;
        const report = [];

        for (const emp of employees) {
            // 4. Calculate Attendance Stats for the Month
            const startDate = `${month}-01`;
            const [year, m] = month.split('-');
            const lastDay = new Date(year, m, 0).getDate();
            const endDate = `${month}-${lastDay}`;

            // Fetch Absent Days (Total count of explicit 'Absent' records + 0.5 for 'Incomplete' PAST DAYS ONLY)
            const absentRes = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_full,
                    COUNT(*) FILTER (WHERE status = 'Incomplete' AND date < CURRENT_DATE) as incomplete_count
                FROM attendance 
                WHERE employee_id = $1 
                AND date >= $2 AND date <= $3 
                AND status IN ('Absent', 'Incomplete')
            `, [emp.id, startDate, endDate]);

            let absentDays = parseInt(absentRes.rows[0].absent_full || 0) + (parseInt(absentRes.rows[0].incomplete_count || 0) * 0.5);

            // Fetch Approved Unpaid Leave Days
            const leaveRes = await client.query(`
                SELECT COALESCE(SUM(unpaid_days), 0) as total_unpaid
                FROM leaves
                WHERE user_id = (SELECT user_id FROM employees WHERE id = $1)
                AND status = 'Approved'
                AND (
                    (start_date >= $2 AND start_date <= $3)
                    OR (end_date >= $2 AND end_date <= $3)
                )
            `, [emp.id, startDate, endDate]);

            const unpaidLeaveDays = parseFloat(leaveRes.rows[0].total_unpaid);
            const totalAbsentDays = absentDays + unpaidLeaveDays;

            // Fetch Late Hours and Early Departure (Short Leave) Hours
            const lateRes = await client.query(`
                SELECT 
                    SUM(COALESCE(late_minutes, 0)) / 60.0 as late_hours,
                    SUM(COALESCE(short_leave_hours, 0)) as early_hours
                FROM attendance
                WHERE employee_id = $1
                AND date >= $2 AND date <= $3
                AND status IN ('Present', 'Incomplete')
            `, [emp.id, startDate, endDate]);

            const lateHours = parseFloat(lateRes.rows[0].late_hours || 0) + parseFloat(lateRes.rows[0].early_hours || 0);

            // 5. Calculate Total Potential Deduction using unified logic
            const basicSalary = parseFloat(emp.basic_salary || 0);
            const currentDayRate = absentRate > 0 ? absentRate : (basicSalary / 30) * policyMultiplier;
            const currentHourRate = lateRate > 0 ? lateRate : (basicSalary / 240);

            let potentialDeduction = (totalAbsentDays * currentDayRate) + (lateHours * currentHourRate);

            // 6. Check Employee's Attendance Allowance
            const allowRes = await client.query(
                'SELECT amount FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                [emp.id, attAllowanceId]
            );

            // Default allowance is global default if not assigned to employee
            const allowanceAmount = allowRes.rows.length > 0 ? parseFloat(allowRes.rows[0].amount) : attAllowanceDefault;

            // 7. Cap Deduction at Allowance Amount
            // "Only deduct ... from the attendance allowance. If it is exceeded, stop the deductions there."
            const deductionAmount = Math.min(potentialDeduction, allowanceAmount);

            if (deductionAmount > 0) {
                // 6. Update Employee Salary Structure (Override)
                const checkRes = await client.query(
                    'SELECT * FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [emp.id, deductionComponentId]
                );

                if (checkRes.rows.length > 0) {
                    await client.query(
                        'UPDATE employee_salary_structure SET amount = $1 WHERE id = $2',
                        [deductionAmount, checkRes.rows[0].id]
                    );
                } else {
                    await client.query(
                        'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)',
                        [emp.id, deductionComponentId, deductionAmount]
                    );
                }

                processedCount++;
                totalDeductionValue += deductionAmount;
            } else {
                const checkRes = await client.query(
                    'SELECT * FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [emp.id, deductionComponentId]
                );
                if (checkRes.rows.length > 0) {
                    await client.query(
                        'UPDATE employee_salary_structure SET amount = 0 WHERE id = $1',
                        [checkRes.rows[0].id]
                    );
                }
            }

            if (deductionAmount > 0 || totalAbsentDays > 0 || lateHours > 0) {
                report.push({
                    employee_id: emp.id,
                    name: emp.name,
                    absent_days: totalAbsentDays,
                    late_hours: lateHours.toFixed(2),
                    deduction_amount: deductionAmount.toFixed(2)
                });
            }
        }

        await client.query('COMMIT');
        res.json({
            message: 'Deductions calculated and applied successfully',
            processed_employees: processedCount,
            total_deduction_value: totalDeductionValue,
            report: report
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Calculation failed: ' + error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    calculateDeductions
};
