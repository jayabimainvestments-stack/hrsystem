const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkLiters() {
    try {
        const res = await pool.query(`
            SELECT mo.quantity, mo.amount, mo.reason
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE u.name ILIKE '%Prasanna%' AND mo.month = '2026-03'
            AND mo.component_id IN (SELECT id FROM salary_components WHERE name ILIKE '%fuel%')
        `);
        console.log("Prasanna Fuel Override details:", res.rows[0]);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkLiters();
