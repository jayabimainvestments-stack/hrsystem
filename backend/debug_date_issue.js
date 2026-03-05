const db = require('./config/db');

async function debugDateIssue() {
    try {
        // Get approved leaves with their attendance records
        const result = await db.query(`
            SELECT 
                l.id as leave_id,
                l.start_date,
                l.end_date,
                l.status as leave_status,
                u.name as employee_name,
                e.id as employee_id,
                a.date as attendance_date,
                a.status as attendance_status,
                a.source as attendance_source
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            JOIN employees e ON e.user_id = u.id
            LEFT JOIN attendance a ON a.employee_id = e.id 
                AND a.date >= l.start_date::date 
                AND a.date <= l.end_date::date
            WHERE l.status = 'Approved'
            AND l.created_at > NOW() - INTERVAL '30 days'
            ORDER BY l.created_at DESC, a.date
            LIMIT 20
        `);

        console.log('\n=== APPROVED LEAVES WITH ATTENDANCE ===\n');

        let currentLeaveId = null;
        result.rows.forEach(row => {
            if (row.leave_id !== currentLeaveId) {
                currentLeaveId = row.leave_id;
                console.log(`\n--- Leave ID: ${row.leave_id} ---`);
                console.log(`Employee: ${row.employee_name} (ID: ${row.employee_id})`);
                console.log(`Leave Period: ${row.start_date} to ${row.end_date}`);
                console.log(`Leave Status: ${row.leave_status}`);
                console.log('Attendance Records:');
            }

            if (row.attendance_date) {
                console.log(`  - ${row.attendance_date} | ${row.attendance_status} | ${row.attendance_source}`);
            } else {
                console.log(`  ✅ No attendance records (absences deleted)`);
            }
        });

        // Check if there are any Absent records for approved leaves
        const absentCheck = await db.query(`
            SELECT COUNT(*) as count
            FROM leaves l
            JOIN employees e ON e.user_id = l.user_id
            JOIN attendance a ON a.employee_id = e.id 
                AND a.date >= l.start_date::date 
                AND a.date <= l.end_date::date
                AND a.status = 'Absent'
            WHERE l.status = 'Approved'
        `);

        console.log(`\n\n⚠️  Total Absent records for Approved leaves: ${absentCheck.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugDateIssue();
