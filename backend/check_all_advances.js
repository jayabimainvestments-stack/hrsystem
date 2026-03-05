const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkAll() {
    try {
        console.log('--- All Financial Requests ---');
        const finRes = await pool.query("SELECT * FROM financial_requests");
        console.log(finRes.rows);

        console.log('\n--- All Monthly Overrides ---');
        const overrideRes = await pool.query("SELECT mo.*, sc.name as component_name FROM monthly_salary_overrides mo JOIN salary_components sc ON mo.component_id = sc.id");
        console.log(overrideRes.rows);

        console.log('\n--- employee_loans ---');
        const loanRes = await pool.query("SELECT * FROM employee_loans");
        console.log(loanRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAll();
