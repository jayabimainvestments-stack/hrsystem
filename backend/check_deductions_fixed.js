const db = require('./config/db');

async function checkManualDeductions() {
    try {
        const month = '2026-02';
        const policyRes = await db.query('SELECT absent_day_amount, late_hourly_rate, absent_deduction_rate FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];
        const dayRate = parseFloat(policy ? policy.absent_day_amount : 0);
        const hourRate = parseFloat(policy ? policy.late_hourly_rate : 0);
        const multiplier = parseFloat(policy ? policy.absent_deduction_rate : 1);

        const result = await db.query(`
            SELECT 
                u.name as employee_name,
                COALESCE(calc.absent_days, 0) as calc_absent_days,
                COALESCE(calc.late_hours, 0) as calc_late_hours
            FROM employees e
            JOIN users u ON e.user_id = u.id
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
        `, [month]);

        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkManualDeductions();
