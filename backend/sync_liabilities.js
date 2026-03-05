const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- SYNCING PAYROLL LIABILITIES FOR FEB 2026 ---');
        await pool.query('BEGIN');

        // 1. Calculate totals from payroll table
        const res = await pool.query(`
            SELECT 
                SUM(CAST(epf_employee AS NUMERIC)) as epf8,
                SUM(CAST(epf_employer AS NUMERIC)) as epf12,
                SUM(CAST(etf_employer AS NUMERIC)) as etf3,
                SUM(CAST(welfare AS NUMERIC)) as welfare2
            FROM payroll
            WHERE month = '2026-02'
        `);
        const totals = res.rows[0];
        console.log('Calculated Totals:', totals);

        // 2. Update payroll_liabilities
        const update = async (type, amount) => {
            console.log(`Updating ${type} to ${amount}...`);
            await pool.query(`
                INSERT INTO payroll_liabilities (month, type, total_payable, status)
                VALUES ('2026-02', $1, $2, 'Pending')
                ON CONFLICT (month, type) 
                DO UPDATE SET total_payable = EXCLUDED.total_payable
            `, [type, amount]);
        };

        await update('EPF 8%', totals.epf8 || 0);
        await update('EPF 12%', totals.epf12 || 0);
        await update('ETF 3%', totals.etf3 || 0);
        await update('Welfare 2%', totals.welfare2 || 0);

        await pool.query('COMMIT');
        console.log('\nSync completed successfully.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('SYNC FAILED:', err);
    } finally {
        await pool.end();
    }
}
run();
