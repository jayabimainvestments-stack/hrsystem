const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkAllReqs() {
    try {
        const finRes = await pool.query("SELECT id, type, status, month FROM financial_requests");
        console.log('--- Financial Requests Summary ---');
        console.log(finRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAllReqs();
