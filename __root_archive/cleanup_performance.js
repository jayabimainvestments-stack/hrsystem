const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5433/hr_db'
});

async function cleanupPerformance() {
    try {
        console.log('--- PERFORMANCE RESET STARTED ---');
        console.log('Testing connection to port 5433...');

        const testRes = await pool.query('SELECT NOW()');
        console.log('Connected to Database successfully at:', testRes.rows[0].now);

        // 1. Delete weekly data
        const res1 = await pool.query('DELETE FROM performance_weekly_data');
        console.log(`✅ Deleted ${res1.rowCount} records from performance_weekly_data`);

        // 2. Delete monthly approvals
        const res2 = await pool.query('DELETE FROM performance_monthly_approvals');
        console.log(`✅ Deleted ${res2.rowCount} records from performance_monthly_approvals`);

        // 3. Delete appraisals
        const res3 = await pool.query('DELETE FROM performance_appraisals');
        console.log(`✅ Deleted ${res3.rowCount} records from performance_appraisals`);

        // 4. Find Performance Salary Component
        const components = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%performance%'");
        if (components.rows.length > 0) {
            const componentIds = components.rows.map(c => c.id);
            const res4 = await pool.query(`DELETE FROM monthly_salary_overrides WHERE component_id = ANY($1)`, [componentIds]);
            console.log(`✅ Deleted ${res4.rowCount} records from monthly_salary_overrides (Performance)`);
        } else {
            console.log('ℹ️ No performance-related salary components found.');
        }

        console.log('--- PERFORMANCE RESET COMPLETED SUCCESSFULLY ---');

    } catch (err) {
        console.error('❌ Cleanup Failed!');
        console.error('ERROR DETAIL:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.error('CAUSE: The database is not running on port 5433. Please run launch_portable.bat first.');
        }
    } finally {
        await pool.end();
    }
}

cleanupPerformance();
