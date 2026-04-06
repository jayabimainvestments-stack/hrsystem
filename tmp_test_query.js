const db = require('./backend/config/db');

async function testQuery() {
    try {
        const targetDate = '2026-04-01';
        console.log(`Testing query with targetDate: ${targetDate}`);
        const res = await db.query('SELECT name FROM company_holidays WHERE date = $1', [targetDate]);
        console.log('Results:', res.rows);

        const res2 = await db.query("SELECT id, date::text, name FROM company_holidays WHERE id = 1");
        console.log('ID 1 raw date:', res2.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testQuery();
