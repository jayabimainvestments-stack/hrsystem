const db = require('./config/db');

/**
 * Test if approved leaves appear in attendance query
 */

async function testLeaveDisplay() {
    try {
        console.log("\n=== TESTING LEAVE DISPLAY IN ATTENDANCE ===\n");

        // Get an employee with approved leave
        const leaveRes = await db.query(`
            SELECT l.*, u.name, e.id as employee_id
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            JOIN employees e ON e.user_id = u.id
            WHERE l.status = 'Approved'
            LIMIT 1
        `);

        if (leaveRes.rows.length === 0) {
            console.log("⚠️  No approved leaves found in system");
            process.exit(0);
        }

        const leave = leaveRes.rows[0];
        console.log("📋 Testing with approved leave:");
        console.log(`   Employee: ${leave.name}`);
        console.log(`   Leave Type: ${leave.leave_type}`);
        console.log(`   Dates: ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]}`);
        console.log(`   Status: ${leave.status}\n`);

        // Query attendance using the same logic as the API
        const attendanceRes = await db.query(`
            SELECT * FROM (
                -- Physical Attendance Logs (excluding absences that have approved leaves)
                SELECT 
                    a.id::text, a.employee_id, a.date::date, 
                    a.clock_in::text, a.clock_out::text, 
                    a.status, a.source, 
                    e.designation, u.name as employee_name, e.department
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                JOIN users u ON e.user_id = u.id
                WHERE NOT (
                    a.status = 'Absent' 
                    AND EXISTS (
                        SELECT 1 FROM leaves l
                        JOIN employees e2 ON e2.user_id = l.user_id
                        WHERE e2.id = a.employee_id
                        AND l.status = 'Approved'
                        AND a.date >= l.start_date::date
                        AND a.date <= l.end_date::date
                    )
                )
                
                UNION ALL
                
                -- Authorized Absence Spectrum (Approved Leaves)
                SELECT 
                    l.id::text, e.id as employee_id, gs.date::date as date, 
                    COALESCE(l.start_time::text, '--:--') as clock_in, 
                    COALESCE(l.end_time::text, '--:--') as clock_out, 
                    l.leave_type as status, 'Authorized Leave' as source,
                    e.designation, u.name as employee_name, e.department
                FROM leaves l
                JOIN users u ON l.user_id = u.id
                JOIN employees e ON e.user_id = u.id
                CROSS JOIN LATERAL generate_series(l.start_date::timestamp, l.end_date::timestamp, '1 day'::interval) gs(date)
                WHERE l.status = 'Approved'
                AND NOT EXISTS (
                    SELECT 1 FROM attendance att 
                    WHERE att.employee_id = e.id 
                    AND att.date = gs.date::date
                    AND att.status != 'Absent'
                )
            ) spectrum
            WHERE spectrum.employee_id = $1
            AND spectrum.date >= $2::date
            AND spectrum.date <= $3::date
            ORDER BY spectrum.date
        `, [leave.employee_id, leave.start_date, leave.end_date]);

        console.log(`🔍 Attendance Query Results (${attendanceRes.rows.length} records):\n`);

        if (attendanceRes.rows.length > 0) {
            console.table(attendanceRes.rows.map(r => ({
                date: r.date.toISOString().split('T')[0],
                status: r.status,
                source: r.source
            })));

            const leaveRecords = attendanceRes.rows.filter(r => r.source === 'Authorized Leave');
            if (leaveRecords.length > 0) {
                console.log(`\n✅ SUCCESS! ${leaveRecords.length} leave record(s) found in attendance query`);
            } else {
                console.log("\n❌ FAIL! No leave records found, only physical attendance");
            }
        } else {
            console.log("⚠️  No records found for this date range");
        }

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

testLeaveDisplay();
