const db = require('./config/db');

async function removeSeededAttendance() {
    console.log('--- REMOVING SEEDED 2026 ATTENDANCE ---');
    try {
        const res = await db.query("DELETE FROM attendance WHERE source = 'DEV_STRESS_TEST_2026'");
        console.log(`✅ Removed ${res.rowCount} seeded records.`);
    } catch (error) {
        console.error('Removal failed:', error);
    } finally {
        process.exit();
    }
}

removeSeededAttendance();
