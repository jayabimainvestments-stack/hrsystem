const db = require('./config/db');

async function checkPrerequisites() {
    try {
        console.log("--- Checking System Prerequisites for Deduction Calculation ---");

        // 1. Check Attendance Policy
        const policyRes = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        if (policyRes.rows.length === 0) {
            console.log("❌ CRITICAL: No Attendance Policy found (ID=1). Run the seed script or create a policy.");
        } else {
            console.log("✅ Attendance Policy found.");
            console.table(policyRes.rows);
        }

        // 2. Check Employees
        const empRes = await db.query("SELECT count(*) FROM employees WHERE employment_status = 'Active'");
        console.log(`ℹ️  Active Employees: ${empRes.rows[0].count}`);

        if (parseInt(empRes.rows[0].count) === 0) {
            console.log("⚠️  WARNING: No active employees found. Calculation will do nothing.");
        }

        // 3. Check Attendance Data (Sample, last 30 days)
        const attRes = await db.query("SELECT count(*) FROM attendance WHERE date >= NOW() - INTERVAL '30 DAYS'");
        console.log(`ℹ️  Attendance Records (Last 30 days): ${attRes.rows[0].count}`);

        if (parseInt(attRes.rows[0].count) === 0) {
            console.log("⚠️  WARNING: No attendance records found in the last 30 days. Deductions based on 'Absent' status will not be calculated.");
        }

        // 4. Check Leaves Data (Approved & Unpaid)
        const leaveRes = await db.query("SELECT count(*) FROM leaves WHERE status = 'Approved' AND unpaid_days > 0");
        console.log(`ℹ️  Approved Unpaid Leaves: ${leaveRes.rows[0].count}`);

        console.log("-------------------------------------------------------------");
        process.exit();
    } catch (error) {
        console.error("Error checking prerequisites:", error);
        process.exit(1);
    }
}

checkPrerequisites();
