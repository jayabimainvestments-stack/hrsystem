const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkPerformanceApprovals() {
    try {
        const res = await pool.query("SELECT * FROM performance_approvals WHERE month = '2026-03'");
        console.log("Performance Approvals for March 2026:");
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkPerformanceApprovals();
