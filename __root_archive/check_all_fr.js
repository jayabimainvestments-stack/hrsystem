const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAllFinancial() {
    try {
        const res = await pool.query("SELECT id, month, type, status FROM financial_requests ORDER BY created_at DESC LIMIT 20");
        console.log("Recent Financial Requests:");
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkAllFinancial();
