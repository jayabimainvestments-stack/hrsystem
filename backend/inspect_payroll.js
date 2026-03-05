const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        console.log('--- Payroll Table Columns ---');
        const res = await pool.query(`
            SELECT column_name, column_default, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payroll'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- All Payroll Records (Detailed) ---');
        const pRes = await pool.query(`
            SELECT p.*, u.name 
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-02'
        `);
        console.log(JSON.stringify(pRes.rows, null, 2));

        console.log('\n--- Payroll Details for All Records ---');
        const dRes = await pool.query(`
            SELECT pd.*, u.name 
            FROM payroll_details pd 
            JOIN payroll p ON pd.payroll_id = p.id 
            JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-02'
        `);
        console.log(JSON.stringify(dRes.rows, null, 2));

        console.log('\n--- Salary Components ---');
        const scRes = await pool.query('SELECT id, name, type, epf_eligible, etf_eligible, welfare_eligible FROM salary_components');
        scRes.rows.forEach(r => console.log(JSON.stringify(r)));

        console.log('\n--- Net Salary Column Schema ---');
        const nsRes = await pool.query(`
            SELECT column_name, column_default, data_type, is_generated 
            FROM information_schema.columns 
            WHERE table_name = 'payroll' AND column_name = 'net_salary'
        `);
        console.log(JSON.stringify(nsRes.rows, null, 2));

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await pool.end();
    }
}

check();
