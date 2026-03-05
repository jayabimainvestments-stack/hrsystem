const db = require('./config/db');

const simulatePayroll = async () => {
    const user_id = 5; // Krishantha
    const month = 'February';
    const year = 2026;
    const datePrefix = '2026-02';

    try {
        console.log(`--- Simulating Payroll for User ${user_id} (${month} ${year}) ---`);

        // 1. Fetch Policy
        const policyRes = await db.query('SELECT * FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];
        console.log('Policy Loaded:', {
            absent_day_amount: policy.absent_day_amount,
            late_hourly_rate: policy.late_hourly_rate,
            work_start_time: policy.work_start_time
        });

        // 2. Fetch Leaves
        // Note: Logic allows checking multiple variations of status or types if needed
        const leaveRes = await db.query(`
            SELECT 
                COALESCE(SUM(unpaid_days), 0) as unpaid_days,
                COUNT(*) FILTER (WHERE leave_type = 'Half Day' AND status = 'Approved') as half_day_count,
                 COUNT(*) as total_leave_records
            FROM leaves 
            WHERE user_id = $1 AND status = 'Approved'
            AND (start_date::text LIKE $2 OR end_date::text LIKE $2)
        `, [user_id, `${datePrefix}%`]);
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
        `, [user_id, `${datePrefix}%`]);
        console.log('Attendance Stats:', attendanceRes.rows[0]);

        // 4. Calculate Deductions
        const lData = leaveRes.rows[0];
        const aData = attendanceRes.rows[0];

        const fullUnpaidDays = parseFloat(lData.unpaid_days || 0) + parseFloat(aData.absent_count || 0) + (parseFloat(lData.half_day_count || 0) * 0.5);
        const totalLateHours = (parseFloat(aData.total_late_minutes || 0) / 60) + parseFloat(aData.total_short_leave_hours || 0);

        // Deductions based on policy
        // Assume default basic salary for calculation if rate is 0 (just like controller)
        // Hardcoding basic salary here to 0 as we just want to verify the logic "still the same" regarding counts
        const hourlyRate = policy?.late_hourly_rate > 0 ? parseFloat(policy.late_hourly_rate) : 0;

        // Calculate absent deduction strictly based on the fixed amount defined in the organization policy
        const absentDeduction = fullUnpaidDays * parseFloat(policy?.absent_day_amount || 0);
        const lateDeduction = totalLateHours * hourlyRate;

        console.log('\n--- Calculation Results ---');
        console.log(`Total Unpaid Days: ${fullUnpaidDays} (Leaves: ${lData.unpaid_days}, Absent: ${aData.absent_count})`);
        console.log(`Absent Deduction: ${absentDeduction} (${fullUnpaidDays} * ${policy?.absent_day_amount})`);

        console.log(`Total Late Hours: ${totalLateHours.toFixed(2)}`);
        console.log(`Late Deduction: ${lateDeduction.toFixed(2)} (${totalLateHours.toFixed(2)} * ${hourlyRate})`);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

simulatePayroll();
