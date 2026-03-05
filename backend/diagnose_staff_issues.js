const db = require('./config/db');

/**
 * Check for potential "Unknown Staff" issues
 * - Missing employee records
 * - Orphaned user records
 * - Missing user-employee links
 */

async function diagnoseStaffIssues() {
    try {
        console.log("\n=== DIAGNOSING STAFF/EMPLOYEE ISSUES ===\n");

        // 1. Check for users without employee records
        const orphanedUsers = await db.query(`
            SELECT u.id, u.name, u.email, u.role
            FROM users u
            LEFT JOIN employees e ON e.user_id = u.id
            WHERE e.id IS NULL
            AND u.role != 'Admin'
        `);

        if (orphanedUsers.rows.length > 0) {
            console.log(`⚠️  Found ${orphanedUsers.rows.length} user(s) without employee records:\n`);
            console.table(orphanedUsers.rows);
        } else {
            console.log("✅ All non-admin users have employee records\n");
        }

        // 2. Check for employees without user records
        const orphanedEmployees = await db.query(`
            SELECT e.id, e.user_id
            FROM employees e
            LEFT JOIN users u ON u.id = e.user_id
            WHERE u.id IS NULL
        `);

        if (orphanedEmployees.rows.length > 0) {
            console.log(`⚠️  Found ${orphanedEmployees.rows.length} employee(s) without user records:\n`);
            console.table(orphanedEmployees.rows);
        } else {
            console.log("✅ All employees have valid user records\n");
        }

        // 3. Check for attendance records with invalid employee IDs
        const invalidAttendance = await db.query(`
            SELECT a.id, a.employee_id, a.date, a.status
            FROM attendance a
            LEFT JOIN employees e ON e.id = a.employee_id
            WHERE e.id IS NULL
            LIMIT 10
        `);

        if (invalidAttendance.rows.length > 0) {
            console.log(`⚠️  Found ${invalidAttendance.rows.length} attendance record(s) with invalid employee IDs:\n`);
            console.table(invalidAttendance.rows);
        } else {
            console.log("✅ All attendance records have valid employee IDs\n");
        }

        // 4. Check for leave records with invalid user IDs
        const invalidLeaves = await db.query(`
            SELECT l.id, l.user_id, l.leave_type, l.start_date
            FROM leaves l
            LEFT JOIN users u ON u.id = l.user_id
            WHERE u.id IS NULL
            LIMIT 10
        `);

        if (invalidLeaves.rows.length > 0) {
            console.log(`⚠️  Found ${invalidLeaves.rows.length} leave record(s) with invalid user IDs:\n`);
            console.table(invalidLeaves.rows);
        } else {
            console.log("✅ All leave records have valid user IDs\n");
        }

        // 5. Summary
        console.log("\n📊 SUMMARY:");
        console.log(`   Orphaned Users: ${orphanedUsers.rows.length}`);
        console.log(`   Orphaned Employees: ${orphanedEmployees.rows.length}`);
        console.log(`   Invalid Attendance: ${invalidAttendance.rows.length}`);
        console.log(`   Invalid Leaves: ${invalidLeaves.rows.length}\n`);

        if (orphanedUsers.rows.length === 0 && orphanedEmployees.rows.length === 0 &&
            invalidAttendance.rows.length === 0 && invalidLeaves.rows.length === 0) {
            console.log("✅ No data integrity issues found!");
        } else {
            console.log("⚠️  Data integrity issues detected - see details above");
        }

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

diagnoseStaffIssues();
