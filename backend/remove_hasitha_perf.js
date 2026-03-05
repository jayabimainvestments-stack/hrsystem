const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function removeHasithaPerformance() {
    try {
        await pool.query('BEGIN');

        console.log('--- Removing Hasitha Performance Override (ID 37) ---');
        const moDel = await pool.query('DELETE FROM monthly_salary_overrides WHERE id = 37');
        console.log(`Deleted ${moDel.rowCount} records from monthly_salary_overrides.`);

        console.log('\n--- Removing Hasitha Monthly Performance Approval (ID 11) ---');
        const pmaDel = await pool.query('DELETE FROM performance_monthly_approvals WHERE id = 11');
        console.log(`Deleted ${pmaDel.rowCount} records from performance_monthly_approvals.`);

        console.log('\n--- Removing Hasitha Weekly Performance Data (IDs 28, 29) ---');
        const pwdDel = await pool.query('DELETE FROM performance_weekly_data WHERE id IN (28, 29)');
        console.log(`Deleted ${pwdDel.rowCount} records from performance_weekly_data.`);

        await pool.query('COMMIT');
        console.log('\nHasitha performance records removed successfully.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Removal failed:', err);
    } finally {
        await pool.end();
    }
}

removeHasithaPerformance();
