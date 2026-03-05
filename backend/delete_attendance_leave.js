const db = require('./config/db');
const fs = require('fs');

async function deleteAttendanceAndLeaveData() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("=== DELETING ALL ATTENDANCE AND LEAVE DATA ===\n");

        // 1. Backup Attendance Data
        console.log("📦 Creating backup of attendance data...");
        const attendanceRes = await client.query("SELECT * FROM attendance ORDER BY date DESC");
        fs.writeFileSync('backup_attendance.json', JSON.stringify(attendanceRes.rows, null, 2));
        console.log(`✅ Backed up ${attendanceRes.rows.length} attendance records to backup_attendance.json`);

        // 2. Backup Leave Data
        console.log("📦 Creating backup of leave data...");
        const leaveRes = await client.query("SELECT * FROM leaves ORDER BY created_at DESC");
        fs.writeFileSync('backup_leaves.json', JSON.stringify(leaveRes.rows, null, 2));
        console.log(`✅ Backed up ${leaveRes.rows.length} leave records to backup_leaves.json`);

        // 3. Delete Attendance Records
        console.log("\n🗑️  Deleting all attendance records...");
        const deleteAttendance = await client.query("DELETE FROM attendance");
        console.log(`✅ Deleted ${deleteAttendance.rowCount} attendance records`);

        // 4. Delete Leave Records
        console.log("🗑️  Deleting all leave records...");
        const deleteLeaves = await client.query("DELETE FROM leaves");
        console.log(`✅ Deleted ${deleteLeaves.rowCount} leave records`);

        // 5. Verify Deletion
        console.log("\n✔️  Verifying deletion...");
        const verifyAttendance = await client.query("SELECT COUNT(*) FROM attendance");
        const verifyLeaves = await client.query("SELECT COUNT(*) FROM leaves");
        console.log(`   Attendance records remaining: ${verifyAttendance.rows[0].count}`);
        console.log(`   Leave records remaining: ${verifyLeaves.rows[0].count}`);

        await client.query('COMMIT');
        console.log("\n✅ ALL ATTENDANCE AND LEAVE DATA DELETED SUCCESSFULLY");
        console.log("\n📁 Backups saved:");
        console.log("   - backup_attendance.json");
        console.log("   - backup_leaves.json");

        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error during deletion:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

deleteAttendanceAndLeaveData();
