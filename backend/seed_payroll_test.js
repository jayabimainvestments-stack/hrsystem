const db = require('./config/db');

async function test() {
    try {
        console.log('Seeding Test Data...');
        const userId = 16; // Krishantha
        const datePrefix = '2026-02';

        // 1. Clear existing for this user/month
        await db.query('DELETE FROM leaves WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM attendance WHERE employee_id = (SELECT id FROM employees WHERE user_id = $1)', [userId]);

        // 2. Paid Leave (Casual) - Should NOT deduce
        await db.query("INSERT INTO leaves (user_id, leave_type_id, leave_type, start_date, end_date, no_of_days, paid_days, unpaid_days, is_unpaid, reason, status) VALUES ($1, 11, 'CASUAL LEAVE', '2026-02-04', '2026-02-04', 1, 1, 0, false, 'Test Leave', 'Approved')", [userId]);

        // 3. Absent - Should deduce
        const empRes = await db.query('SELECT id FROM employees WHERE user_id=$1', [userId]);
        const empId = empRes.rows[0].id;

        await db.query("INSERT INTO attendance (employee_id, date, status, clock_in, clock_out, source) VALUES ($1, '2026-02-05', 'Absent', NULL, NULL, 'Manual')", [empId]);

        // 4. Late - Should deduce
        await db.query("INSERT INTO attendance (employee_id, date, status, clock_in, clock_out, source, late_minutes) VALUES ($1, '2026-02-06', 'Late', '09:30:00', '17:00:00', 'Manual', 60)", [empId]);

        console.log(`✅ Seeded test data for User ${userId}`);

        // --- Run Simulation ---

        console.log(`\n--- Simulating Payroll for User ${userId} (February 2026) ---`);

        // 1. Fetch Policy
        const policyRes = await db.query('SELECT * FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];
        console.log('Policy Loaded:', {
            absent_day_amount: policy.absent_day_amount,
            late_hourly_rate: policy.late_hourly_rate,
            work_start_time: policy.work_start_time
        });

        // 2. Fetch Leaves
        const leaveRes = await db.query(`
            SELECT 
                COALESCE(SUM(unpaid_days), 0) as unpaid_days,
                COUNT(*) FILTER (WHERE leave_type = 'Half Day' AND status = 'Approved') as half_day_count,
                 COUNT(*) as total_leave_records
            FROM leaves 
            WHERE user_id = $1 AND status = 'Approved'
            AND (start_date::text LIKE $2 OR end_date::text LIKE $2)
        `, [userId, `${datePrefix}%`]);
        console.log('Leave Stats:', leaveRes.rows[0]);

        // 3. Fetch Attendance Stats
        const attendanceRes = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE LOWER(a.status) = 'absent') as absent_count,
                COALESCE(SUM(a.late_minutes), 0) as total_late_minutes,
                COALESCE(SUM(a.short_leave_hours), 0) as total_short_leave_hours
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE e.user_id = $1 AND a.date::text LIKE $2
        `, [userId, `${datePrefix}%`]);
        console.log('Attendance Stats:', attendanceRes.rows[0]);

        // 4. Calculate Deductions
        const lData = leaveRes.rows[0];
        const aData = attendanceRes.rows[0];

        const fullUnpaidDays = parseFloat(lData.unpaid_days || 0) + parseFloat(aData.absent_count || 0) + (parseFloat(lData.half_day_count || 0) * 0.5);
        const totalLateHours = (parseFloat(aData.total_late_minutes || 0) / 60) + parseFloat(aData.total_short_leave_hours || 0);

        const hourlyRate = policy?.late_hourly_rate > 0 ? parseFloat(policy.late_hourly_rate) : 0;

        const absentDeduction = fullUnpaidDays * parseFloat(policy?.absent_day_amount || 0);
        const lateDeduction = totalLateHours * hourlyRate;

        console.log('\n--- Calculation Results ---');
        console.log(`Total Unpaid Days: ${fullUnpaidDays} (Leaves: ${lData.unpaid_days}, Absent: ${aData.absent_count})`);
        console.log(`Absent Deduction: ${absentDeduction} (${fullUnpaidDays} * ${policy?.absent_day_amount})`);

        console.log(`Total Late Hours: ${totalLateHours.toFixed(2)}`);
        console.log(`Late Deduction: ${lateDeduction.toFixed(2)} (${totalLateHours.toFixed(2)} * ${hourlyRate})`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
