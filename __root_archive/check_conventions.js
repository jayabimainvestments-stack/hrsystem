const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkConventions() {
    try {
        const res = await pool.query("SELECT DISTINCT status FROM monthly_salary_overrides");
        console.log("Status values found in DB:", res.rows.map(r => r.status));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkConventions();
