const db = require('./config/db');

async function resetData() {
    try {
        console.log('--- RESETTING ATTENDANCE AND LEAVES ---');

        // 1. Clear Attendance
        await db.query('DELETE FROM attendance');
        console.log('✅ Deleted all records from [attendance]');

        // 2. Clear Leaves
        await db.query('DELETE FROM leaves');
        console.log('✅ Deleted all records from [leaves]');

        // 3. Reset Leave Balances
        // allocated_days is the quota. used_days = 0. remaining_days is generated.
        await db.query('UPDATE leave_balances SET used_days = 0');
        console.log('✅ Reset [leave_balances]: used_days = 0');

        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
}

resetData();
