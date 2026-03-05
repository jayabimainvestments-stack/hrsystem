const db = require('./config/db');

async function checkTables() {
    try {
        console.log('--- CHECKING TABLE ROW COUNTS ---');
        const tables = ['users', 'employees', 'leaves', 'attendance', 'leave_balances', 'leave_types'];

        for (const table of tables) {
            const res = await db.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`${table}: ${res.rows[0].count}`);
        }

        console.log('\n--- CHECKING LEAVE BALANCES (Sample) ---');
        const balRes = await db.query('SELECT * FROM leave_balances LIMIT 5');
        console.log(balRes.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkTables();
