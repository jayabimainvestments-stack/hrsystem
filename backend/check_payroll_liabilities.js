const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Payroll Liabilities for Feb 2026 ---');
        const data = await pool.query("SELECT * FROM payroll_liabilities WHERE month = '2026-02'");
        console.log(data.rows);

        const breakdown = await pool.query(`
            SELECT p.id as payroll_id, u.name, pd.component_name, pd.amount 
            FROM payroll_details pd 
            JOIN payroll p ON pd.payroll_id = p.id 
            JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-02' AND pd.component_name ILIKE '%Welfare%'
        `);
        console.log('\n--- Welfare Breakdown from Payroll Details ---');
        console.log(breakdown.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
