const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPayroll() {
    try {
        const res = await pool.query("SELECT * FROM payroll_details WHERE component_name ILIKE '%advance%'");
        console.log('Payroll Details with Salary Advance:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkPayroll();
