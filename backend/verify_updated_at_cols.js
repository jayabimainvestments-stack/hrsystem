const db = require('./config/db');

async function checkTables() {
    const tables = ['leaves', 'employee_loans', 'financial_requests', 'resignations', 'pending_changes'];
    try {
        for (const table of tables) {
            const res = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'updated_at'
            `, [table]);

            if (res.rows.length > 0) {
                console.log(`✅ Table '${table}' HAS 'updated_at' column.`);
            } else {
                console.log(`❌ Table '${table}' MISSES 'updated_at' column.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkTables();
