const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPayroll() {
    try {
        console.log('--- Payroll Records for 2026-02 ---');
        const payrollRes = await pool.query(`
            SELECT p.*, u.name 
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-02'
        `);
        console.log(JSON.stringify(payrollRes.rows, null, 2));

        if (payrollRes.rows.length > 0) {
            const payrollId = payrollRes.rows[0].id;
            console.log(`\n--- Payroll Details for ID ${payrollId} (${payrollRes.rows[0].name}) ---`);
            const detailsRes = await pool.query(`
                SELECT * FROM payroll_details 
                WHERE payroll_id = $1
            `, [payrollId]);
            console.log(JSON.stringify(detailsRes.rows, null, 2));
        }

        console.log('\n--- Employee EPF/ETF Eligibility ---');
        const empRes = await pool.query(`
            SELECT e.id, u.name, e.is_epf_eligible, e.is_etf_eligible 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active' OR e.employment_status IS NULL
        `);
        console.log(JSON.stringify(empRes.rows, null, 2));

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await pool.end();
    }
}

checkPayroll();
