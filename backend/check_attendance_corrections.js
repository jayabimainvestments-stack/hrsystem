const db = require('./config/db');

/**
 * Check if absences still exist where approved leaves should be
 */

async function checkAttendanceCorrections() {
    try {
        console.log("\n=== CHECKING ATTENDANCE CORRECTIONS ===\n");

        // Check for overlapping absences and approved leaves
        const result = await db.query(`
            SELECT 
                e.id as employee_id,
                u.name as employee_name,
                a.date,
                a.status as attendance_status,
                l.leave_type,
                l.status as leave_status
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN leaves l ON l.user_id = u.id
            WHERE a.status = 'Absent'
            AND l.status = 'Approved'
            AND a.date >= l.start_date::date
            AND a.date <= l.end_date::date
            ORDER BY u.name, a.date
        `);

        if (result.rows.length > 0) {
            console.log(`⚠️  Found ${result.rows.length} absence records that should have been deleted:\n`);
            console.table(result.rows);

            console.log("\n🔧 These absences should be removed because approved leaves exist for these dates.");
            console.log("   This happens if leaves were approved BEFORE the auto-delete feature was added.\n");
        } else {
            console.log("✅ No conflicting absences found. All corrections are applied correctly.\n");
        }

        // Check total attendance records
        const totalRes = await db.query("SELECT COUNT(*) as count FROM attendance");
        console.log(`📊 Total attendance records: ${totalRes.rows[0].count}`);

        // Check approved leaves
        const leavesRes = await db.query("SELECT COUNT(*) as count FROM leaves WHERE status = 'Approved'");
        console.log(`🏖️  Total approved leaves: ${leavesRes.rows[0].count}\n`);

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkAttendanceCorrections();
