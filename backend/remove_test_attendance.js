const db = require('./config/db');

async function removeTestAttendance() {
    const source = 'DEV_STRESS_TEST_2026';
    try {
        console.log(`Removing test attendance records with source: ${source}...`);
        const result = await db.query('DELETE FROM attendance WHERE source = $1', [source]);
        console.log(`Successfully removed ${result.rowCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to remove test attendance:', error);
        process.exit(1);
    }
}

removeTestAttendance();
