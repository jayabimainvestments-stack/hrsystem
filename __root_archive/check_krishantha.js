const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkKrishantha() {
    try {
        const id = 27;
        console.log("--- AUDIT: KRISHANTHA (ID 27) ---");
        
        const annualPerf = await pool.query("SELECT * FROM employee_salary_structure WHERE employee_id = $1 AND component_id = 201", [id]);
        if (annualPerf.rows.length > 0) {
            console.log(`- Annual Performance: Rs. ${annualPerf.rows[0].amount} [LINKED]`);
        } else {
            console.log(`- Annual Performance: [MISSING LINK] ⚠️`);
        }

        const overrides = await pool.query(`
            SELECT sc.name, mo.amount, mo.status 
            FROM monthly_salary_overrides mo 
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1 AND mo.month = '2026-03'
        `, [id]);
        
        if (overrides.rows.length > 0) {
            overrides.rows.forEach(ov => console.log(`- Override: ${ov.name} - Rs. ${ov.amount} [${ov.status}]`));
        } else {
            console.log("- No monthly overrides found for March.");
        }
        
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkKrishantha();
