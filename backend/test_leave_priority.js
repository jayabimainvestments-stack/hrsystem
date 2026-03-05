const db = require('./config/db');

/**
 * Test Leave Priority Logic
 * Creates a test scenario where an employee is marked absent but has approved leave
 */

async function testLeavePriority() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("\n=== TESTING LEAVE PRIORITY LOGIC ===\n");

        // Get first active employee
        const empRes = await client.query(`
            SELECT e.id, u.id as user_id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
            LIMIT 1
        `);

        if (empRes.rows.length === 0) {
            console.log("❌ No active employees found");
            process.exit(1);
        }

        const employee = empRes.rows[0];
        console.log(`👤 Testing with: ${employee.name} (Employee ID: ${employee.id})`);

        // Create an absence record for today
        const testDate = '2026-02-10';
        console.log(`\n📅 Creating absence record for ${testDate}...`);

        await client.query(
            `INSERT INTO attendance (employee_id, date, status, source)
             VALUES ($1, $2, 'Absent', 'Manual')
             ON CONFLICT (employee_id, date) DO UPDATE
             SET status = 'Absent', source = 'Manual'`,
            [employee.id, testDate]
        );
        console.log("✅ Absence record created");

        // Create an approved casual leave for the same date
        console.log(`\n🏖️  Creating approved casual leave for ${testDate}...`);

        const leaveTypeRes = await client.query("SELECT id FROM leave_types WHERE name ILIKE '%casual%' LIMIT 1");
        let leaveTypeId = leaveTypeRes.rows[0]?.id;

        if (!leaveTypeId) {
            console.log("⚠️  No casual leave type found, using first available leave type");
            const anyLeaveRes = await client.query("SELECT id FROM leave_types LIMIT 1");
            leaveTypeId = anyLeaveRes.rows[0]?.id;
        }

        await client.query(
            `INSERT INTO leaves (user_id, leave_type_id, leave_type, start_date, end_date, reason, status, unpaid_days)
             VALUES ($1, $2, 'Casual Leave', $3, $3, 'Testing leave priority', 'Approved', 0)`,
            [employee.user_id, leaveTypeId, testDate]
        );
        console.log("✅ Approved leave created");

        // Query attendance using the same logic as the controller
        console.log(`\n🔍 Querying attendance for ${testDate}...`);

        const result = await client.query(`
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
            WHERE spectrum.date = $1 AND spectrum.employee_id = $2
            ORDER BY spectrum.date DESC
        `, [testDate, employee.id]);

        console.log(`\n📊 Results (${result.rows.length} record(s)):`);
        console.table(result.rows);

        if (result.rows.length === 1 && result.rows[0].status === 'Casual Leave') {
            console.log("\n✅ SUCCESS! Leave record is displayed instead of absence");
        } else if (result.rows.length === 0) {
            console.log("\n❌ FAIL! No records returned");
        } else if (result.rows.some(r => r.status === 'Absent')) {
            console.log("\n❌ FAIL! Absence record is still showing");
        } else {
            console.log("\n⚠️  Unexpected result");
        }

        await client.query('ROLLBACK');
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

testLeavePriority();
