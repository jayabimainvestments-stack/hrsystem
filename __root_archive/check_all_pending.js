const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAllPending() {
    try {
        const res = await pool.query(`
            SELECT month, status, COUNT(*) 
            FROM monthly_salary_overrides 
            WHERE status != 'Approved' AND status != 'Rejected'
            GROUP BY month, status
        `);
        console.log("Pending Overrides across ALL months:");
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkAllPending();
