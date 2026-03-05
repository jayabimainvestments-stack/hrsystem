const db = require('./config/db');

async function checkAttendanceData() {
    try {
        console.log("--- Checking Attendance Data (2026-01-01 to 2026-02-15) ---\n");

        // Check total attendance records
        const totalRes = await db.query("SELECT COUNT(*) as count FROM attendance");
        console.log(`📊 Total Attendance Records in System: ${totalRes.rows[0].count}`);

        // Check records in the specified date range
        const rangeRes = await db.query(
            "SELECT COUNT(*) as count FROM attendance WHERE date >= $1 AND date <= $2",
            ['2026-01-01', '2026-02-15']
        );
        console.log(`📅 Records between 2026-01-01 and 2026-02-15: ${rangeRes.rows[0].count}`);

        // Show sample records if any exist
        const sampleRes = await db.query(
            `SELECT a.date, u.name as employee_name, a.clock_in, a.clock_out, a.status, a.source
             FROM attendance a
             JOIN employees e ON a.employee_id = e.id
             JOIN users u ON e.user_id = u.id
             WHERE a.date >= $1 AND a.date <= $2
             ORDER BY a.date DESC
             LIMIT 10`,
            ['2026-01-01', '2026-02-15']
        );

        if (sampleRes.rows.length > 0) {
            console.log("\n📋 Sample Records:");
            console.table(sampleRes.rows);
        } else {
            console.log("\n⚠️  NO ATTENDANCE RECORDS found in this date range.");
        }

        // Check all dates that DO have records
        const datesRes = await db.query(
            `SELECT date, COUNT(*) as count 
             FROM attendance 
             GROUP BY date 
             ORDER BY date DESC 
             LIMIT 20`
        );

        if (datesRes.rows.length > 0) {
            console.log("\n📆 Dates with Attendance Records (Last 20):");
            console.table(datesRes.rows);
        }

        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkAttendanceData();
