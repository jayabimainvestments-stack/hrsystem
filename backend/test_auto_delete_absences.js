const db = require('./config/db');

/**
 * Test Auto-Delete Absences on Leave Approval
 */

async function testAutoDeleteAbsences() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("\n=== TESTING AUTO-DELETE ABSENCES ON LEAVE APPROVAL ===\n");

        // Get first active employee
        const empRes = await client.query(`
            SELECT e.id, u.id as user_id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
            LIMIT 1
        `);

        const employee = empRes.rows[0];
        console.log(`👤 Testing with: ${employee.name}`);
        console.log(`   Employee ID: ${employee.id}`);
        console.log(`   User ID: ${employee.user_id}\n`);

        // Create absence records for Feb 12-14
        const dates = ['2026-02-12', '2026-02-13', '2026-02-14'];
        console.log("📅 Creating absence records for Feb 12-14...");

        for (const date of dates) {
            await client.query(
                `INSERT INTO attendance (employee_id, date, status, source)
                 VALUES ($1, $2, 'Absent', 'Manual')
                 ON CONFLICT (employee_id, date) DO UPDATE
                 SET status = 'Absent', source = 'Manual'`,
                [employee.id, date]
            );
        }
        console.log("✅ Created 3 absence records\n");

        // Verify absences exist
        const beforeCheck = await client.query(
            `SELECT date, status FROM attendance 
             WHERE employee_id = $1 AND date >= '2026-02-12' AND date <= '2026-02-14'
             ORDER BY date`,
            [employee.id]
        );
        console.log("📊 Absences BEFORE leave approval:");
        console.table(beforeCheck.rows);

        // Create a pending leave request for Feb 12-14
        console.log("\n🏖️  Creating leave request for Feb 12-14...");
        const leaveTypeRes = await client.query("SELECT id FROM leave_types LIMIT 1");
        const leaveTypeId = leaveTypeRes.rows[0].id;

        const leaveInsert = await client.query(
            `INSERT INTO leaves (user_id, leave_type_id, leave_type, start_date, end_date, reason, status, paid_days, unpaid_days)
             VALUES ($1, $2, 'Casual Leave', '2026-02-12', '2026-02-14', 'Testing auto-delete', 'Pending', 3, 0)
             RETURNING id`,
            [employee.user_id, leaveTypeId]
        );
        const leaveId = leaveInsert.rows[0].id;
        console.log(`✅ Leave request created (ID: ${leaveId})\n`);

        // Simulate leave approval (using the controller logic)
        console.log("✅ Approving leave...");

        const leave = await client.query('SELECT * FROM leaves WHERE id = $1', [leaveId]);
        const leaveData = leave.rows[0];

        // Delete absence records (same logic as controller)
        const deleteResult = await client.query(`
            DELETE FROM attendance 
            WHERE employee_id = $1 
            AND date >= $2::date 
            AND date <= $3::date 
            AND status = 'Absent'
        `, [employee.id, leaveData.start_date, leaveData.end_date]);

        console.log(`🗑️  Deleted ${deleteResult.rowCount} absence record(s)\n`);

        // Update leave status
        await client.query(
            'UPDATE leaves SET status = $1 WHERE id = $2',
            ['Approved', leaveId]
        );
        console.log("✅ Leave approved\n");

        // Verify absences are gone
        const afterCheck = await client.query(
            `SELECT date, status FROM attendance 
             WHERE employee_id = $1 AND date >= '2026-02-12' AND date <= '2026-02-14'
             ORDER BY date`,
            [employee.id]
        );

        console.log("📊 Absences AFTER leave approval:");
        if (afterCheck.rows.length === 0) {
            console.log("   ✅ NO RECORDS (All absences deleted successfully!)");
        } else {
            console.table(afterCheck.rows);
        }

        // Verify leave shows in attendance query
        console.log("\n🔍 Checking attendance query (should show leave)...");
        const attendanceQuery = await client.query(`
            SELECT * FROM (
                SELECT 
                    a.id::text, a.employee_id, a.date::date, 
                    a.clock_in::text, a.clock_out::text, 
                    a.status, a.source
                FROM attendance a
                WHERE a.employee_id = $1
                
                UNION ALL
                
                SELECT 
                    l.id::text, e.id as employee_id, gs.date::date as date, 
                    COALESCE(l.start_time::text, '--:--') as clock_in, 
                    COALESCE(l.end_time::text, '--:--') as clock_out, 
                    l.leave_type as status, 'Authorized Leave' as source
                FROM leaves l
                JOIN employees e ON e.user_id = l.user_id
                CROSS JOIN LATERAL generate_series(l.start_date::timestamp, l.end_date::timestamp, '1 day'::interval) gs(date)
                WHERE l.status = 'Approved'
                AND e.id = $1
            ) spectrum
            WHERE spectrum.date >= '2026-02-12' AND spectrum.date <= '2026-02-14'
            ORDER BY spectrum.date
        `, [employee.id]);

        console.log("\n📋 Attendance Records (Feb 12-14):");
        console.table(attendanceQuery.rows);

        if (attendanceQuery.rows.length === 3 && attendanceQuery.rows.every(r => r.status === 'Casual Leave')) {
            console.log("\n✅ SUCCESS! All 3 days show as 'Casual Leave'");
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

testAutoDeleteAbsences();
