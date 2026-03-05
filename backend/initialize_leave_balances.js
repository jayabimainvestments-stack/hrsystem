const db = require('./config/db');

async function initializeBalances() {
    try {
        console.log('--- Initializing Leave Balances (2026) ---');
        await db.query('BEGIN');

        // 1. Fetch all users (non-admin preferred, but let's do all for simplicity)
        const usersRes = await db.query('SELECT id, name FROM users');
        const users = usersRes.rows;

        // 2. Fetch leave types
        const typesRes = await db.query('SELECT id, name, annual_limit FROM leave_types');
        const leaveTypes = typesRes.rows;

        const currentYear = 2026;

        for (const user of users) {
            console.log(`Processing User: ${user.name} (ID: ${user.id})`);
            for (const type of leaveTypes) {
                // Insert balance if not exists
                await db.query(`
                    INSERT INTO leave_balances (user_id, leave_type_id, year, allocated_days)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_id, leave_type_id, year) DO NOTHING
                `, [user.id, type.id, currentYear, type.annual_limit]);
            }
        }

        await db.query('COMMIT');
        console.log('--- Initialization Completed ---');
        process.exit(0);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

initializeBalances();
