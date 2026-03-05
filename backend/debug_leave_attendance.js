const db = require('./config/db');

async function debugLeaveAttendance() {
    try {
        // 1. Get an approved leave
        const leaveResult = await db.query(`
            SELECT l.*, u.name as employee_name, e.id as employee_id
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            JOIN employees e ON e.user_id = u.id
            WHERE l.status = 'Approved'
            ORDER BY l.created_at DESC
            LIMIT 1
        `);

        if (leaveResult.rows.length === 0) {
            console.log('No approved leaves found');
            process.exit(0);
        }

        const leave = leaveResult.rows[0];
        console.log('\n=== APPROVED LEAVE ===');
        console.log(`Employee: ${leave.employee_name}`);
        console.log(`Employee ID: ${leave.employee_id}`);
        console.log(`Leave Type: ${leave.leave_type}`);
        console.log(`Period: ${leave.start_date} to ${leave.end_date}`);
        console.log(`Status: ${leave.status}`);

        // 2. Check attendance records for this period
        const attendanceResult = await db.query(`
            SELECT date, status, source, clock_in, clock_out
            FROM attendance
            WHERE employee_id = $1
            AND date >= $2::date
            AND date <= $3::date
            ORDER BY date
        `, [leave.employee_id, leave.start_date, leave.end_date]);

        console.log(`\n=== ATTENDANCE RECORDS (${attendanceResult.rows.length} found) ===`);
        if (attendanceResult.rows.length === 0) {
            console.log('✅ No attendance records found - absences were deleted correctly!');
        } else {
            attendanceResult.rows.forEach(att => {
                console.log(`Date: ${att.date.toISOString().split('T')[0]} | Status: ${att.status} | Source: ${att.source}`);
            });
            console.log('\n⚠️  ISSUE: Attendance records still exist for approved leave period!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugLeaveAttendance();
