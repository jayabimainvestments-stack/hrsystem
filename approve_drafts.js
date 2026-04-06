const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function approveDrafts() {
    try {
        const res = await pool.query("UPDATE monthly_salary_overrides SET status = 'Approved' WHERE month = '2026-03' AND status IN ('Draft', 'Pending')");
        console.log(`Updated ${res.rowCount} overrides to Approved.`);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
approveDrafts();
