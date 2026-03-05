const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debug() {
    try {
        console.log('--- Attendance Policies ---');
        const policyRes = await pool.query('SELECT * FROM attendance_policies');
        console.log(policyRes.rows);

        const month = '2026-02';
        console.log(`\n--- Testing getManualDeductions Query for ${month} ---`);

        const policy = policyRes.rows[0];
        const dayRate = parseFloat(policy ? policy.absent_day_amount : 0);
        const hourRate = parseFloat(policy ? policy.late_hourly_rate : 0);
        const multiplier = parseFloat(policy ? policy.absent_deduction_rate : 1);

        // Exact query from controller
        const result = await pool.query(`
            SELECT 
                e.id as employee_id, 
                COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                u.name as employee_name,
                ad.id as deduction_id,
                COALESCE(ad.deduct_days, calc.absent_days, 0) as deduct_days,
                COALESCE(ad.deduct_hours, calc.late_hours, 0) as deduct_hours,
                CASE WHEN $2 > 0 THEN $2 ELSE (COALESCE(sal.basic_salary, 0) / 30.0) * $4 END as effective_day_rate,
                CASE WHEN $3 > 0 THEN $3 ELSE (COALESCE(sal.basic_salary, 0) / 240.0) END as effective_hour_rate,
                COALESCE(ad.total_amount, 
                        (COALESCE(calc.absent_days, 0) * (CASE WHEN $2 > 0 THEN $2 ELSE (COALESCE(sal.basic_salary, 0) / 30.0) * $4 END)) + 
                        (COALESCE(calc.late_hours, 0) * (CASE WHEN $3 > 0 THEN $3 ELSE (COALESCE(sal.basic_salary, 0) / 240.0) END))
                ) as total_amount,
                COALESCE(ad.status, 'Pending') as status,
                ad.created_by,
                ad.approved_by_1,
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
                           COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                           ROUND(SUM(COALESCE(late_minutes, 0)) / 60.0, 2) as late_hours
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

        console.log('Results count:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('Sample Row:', result.rows[0]);
        }

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await pool.end();
    }
}

debug();
