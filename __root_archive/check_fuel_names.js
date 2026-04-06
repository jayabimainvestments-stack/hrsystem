const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkNames() {
    try {
        const fr = await pool.query("SELECT type FROM financial_requests WHERE month = '2026-03'");
        console.log("Financial Request Types for March 2026:");
        console.table(fr.rows);

        const sc = await pool.query("SELECT name, status, type FROM salary_components");
        console.log("ALL Salary Components:");
        console.table(sc.rows);

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkNames();
