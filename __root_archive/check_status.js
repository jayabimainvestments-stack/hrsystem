const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkStatusCounts() {
    try {
        const res = await pool.query(`
            SELECT status, COUNT(*) 
            FROM monthly_salary_overrides 
            WHERE month = '2026-03' 
            GROUP BY status
        `);
        console.log("March 2026 Overrides Status Counts:");
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkStatusCounts();
