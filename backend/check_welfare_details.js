const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Individual Welfare Records (Feb 2026) ---');
        const res = await pool.query(`
            SELECT p.id as payroll_id, u.name, pd.component_name, pd.amount 
            FROM payroll_details pd 
            JOIN payroll p ON pd.payroll_id = p.id 
            JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-02' 
            AND pd.component_name ILIKE '%Welfare%' 
            ORDER BY u.name
        `);
        console.log(res.rows);

        const compRes = await pool.query("SELECT name FROM salary_components WHERE name ILIKE '%Welfare%'");
        console.log('\n--- Salary Components for Welfare ---');
        console.log(compRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
