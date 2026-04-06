const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkFinancial() {
    try {
        const res = await pool.query("SELECT * FROM financial_requests WHERE month = '2026-03'");
        console.log("Financial Requests for March 2026:");
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkFinancial();
