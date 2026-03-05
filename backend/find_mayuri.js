const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT e.id as emp_id, u.id as user_id, u.name 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Mayuri%'
        `);
        console.log('Mayuri info:', res.rows);

        const payrollRes = await pool.query(`
            SELECT * FROM payroll WHERE user_id = $1 AND month = '2026-02'
        `, [res.rows[0]?.user_id]);
        console.log('Mayuri Payroll Feb 2026:', payrollRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
