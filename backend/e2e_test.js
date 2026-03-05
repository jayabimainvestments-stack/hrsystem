const db = require('./config/db');

async function testFlow() {
    try {
        console.log('--- STARTING E2E TEST ---');

        // 1. Identify an employee
        const empRes = await db.query('SELECT id, user_id FROM employees LIMIT 1');
        if (empRes.rows.length === 0) throw new Error('No employees found');
        const emp = empRes.rows[0];
        console.log('Testing with Employee ID:', emp.id);

        // 2. Ensure Policy is set to 2000
        await db.query('UPDATE attendance_policies SET absent_day_amount = 2000 WHERE id = 1');
        console.log('Policy forced to 2000.');

        // 3. Create Attendance Record for Feb 2026
        const testDate = '2026-02-13';
        await db.query('DELETE FROM attendance WHERE employee_id = $1 AND date = $2', [emp.id, testDate]);
        await db.query('INSERT INTO attendance (employee_id, date, status, source) VALUES ($1, $2, \'Absent\', \'E2E-TEST\')', [emp.id, testDate]);
        console.log('Attendance "Absent" record created for', testDate);

        // 4. Trace the calculation (Manual run of controller logic)
        const datePrefix = '2026-02';
        const policyRes = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];

        const attendanceRes = await db.query(`
            SELECT COUNT(*) FILTER (WHERE LOWER(status) = 'absent') as absent_count
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE e.user_id = $1 AND a.date::text LIKE $2
        `, [emp.user_id, `${datePrefix}%`]);

        const absentCount = parseInt(attendanceRes.rows[0].absent_count);
        const deduction = absentCount * parseFloat(policy.absent_day_amount);

        console.log('Calculation Data:', {
            datePrefix,
            policy_amount: policy.absent_day_amount,
            absentCount,
            deduction
        });

        if (deduction === 2000) {
            console.log('SUCCESS: Calculation logic is correct.');
        } else {
            console.log('FAILURE: Expected 2000, got', deduction);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testFlow();
