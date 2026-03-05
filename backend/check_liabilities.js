const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Liabilities Table Schema ---');
        const schema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'liabilities'
        `);
        console.log(schema.rows);

        console.log('\n--- Liabilities Data for Feb 2026 ---');
        const data = await pool.query("SELECT * FROM liabilities WHERE month = '2026-02'");
        console.log(data.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
