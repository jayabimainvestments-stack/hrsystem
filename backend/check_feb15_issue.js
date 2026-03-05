const db = require('./config/db');

async function checkFeb15Issue() {
    try {
        // Check what day Feb 15, 2026 is
        const date = new Date('2026-02-15');
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        console.log('\n=== CHECKING FEB 15, 2026 ===');
        console.log(`Date: ${date.toDateString()}`);
        console.log(`Day of Week: ${dayOfWeek}`);
        console.log(`Is Weekend: ${dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday' ? 'YES' : 'NO'}`);

        // Check attendance records for this date
        const attendanceResult = await db.query(`
            SELECT 
                a.id,
                a.date,
                a.status,
                a.source,
                a.clock_in,
                a.clock_out,
                e.id as employee_id,
                u.name as employee_name
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE a.date = '2026-02-15'
            ORDER BY u.name
        `);

        console.log(`\n=== ATTENDANCE RECORDS FOR FEB 15 (${attendanceResult.rows.length} found) ===\n`);

        attendanceResult.rows.forEach((record, index) => {
            console.log(`${index + 1}. ${record.employee_name}`);
            console.log(`   Status: ${record.status}`);
            console.log(`   Source: ${record.source}`);
            console.log(`   Clock In: ${record.clock_in || 'N/A'}`);
            console.log(`   Clock Out: ${record.clock_out || 'N/A'}`);
            console.log('');
        });

        // Check if there are any leaves for this date
        const leaveResult = await db.query(`
            SELECT 
                l.id,
                l.leave_type,
                l.status,
                u.name as employee_name
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE '2026-02-15'::date >= l.start_date::date
            AND '2026-02-15'::date <= l.end_date::date
        `);

        console.log(`=== LEAVES FOR FEB 15 (${leaveResult.rows.length} found) ===\n`);
        leaveResult.rows.forEach((leave, index) => {
            console.log(`${index + 1}. ${leave.employee_name}`);
            console.log(`   Type: ${leave.leave_type}`);
            console.log(`   Status: ${leave.status}`);
            console.log('');
        });

        // Check attendance policy
        const policyResult = await db.query('SELECT * FROM attendance_policies LIMIT 1');
        if (policyResult.rows.length > 0) {
            const policy = policyResult.rows[0];
            console.log('=== ATTENDANCE POLICY ===');
            console.log(`Working Days: ${JSON.stringify(policy.working_days || 'Not set')}`);
            console.log(`Mark Weekends Absent: ${policy.mark_weekends_absent || 'Not set'}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkFeb15Issue();
