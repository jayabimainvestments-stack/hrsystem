const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkPending() {
    try {
        console.log("--- MARCH 2026 PENDING ITEMS ---");
        
        const overrides = await pool.query(`
            SELECT u.name, sc.name as component, mo.status 
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE mo.month = '2026-03' AND mo.status != 'Approved'
        `);
        console.log(`Pending Overrides: ${overrides.rows.length}`);
        overrides.rows.forEach(r => console.log(`- ${r.name}: ${r.component} [${r.status}]`));

        const financial = await pool.query(`
            SELECT u.name, fr.status 
            FROM financial_requests fr
            JOIN employees e ON fr.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE fr.month = '2026-03' AND fr.status != 'Approved'
        `);
        console.log(`\nPending Financial Requests: ${financial.rows.length}`);
        financial.rows.forEach(r => console.log(`- ${r.name}: [${r.status}]`));

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkPending();
