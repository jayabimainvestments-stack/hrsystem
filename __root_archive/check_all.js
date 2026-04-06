const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAllActive() {
    try {
        const res = await pool.query("SELECT e.id, u.name, e.employee_id FROM employees e JOIN users u ON e.user_id = u.id WHERE e.employment_status = 'Active'");
        console.log("All Active Employees:");
        res.rows.forEach(r => console.log(`- ${r.name} (ID: ${r.id}, Code: ${r.employee_id})`));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkAllActive();
