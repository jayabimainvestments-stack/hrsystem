const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5433/hr_db'
});

async function inspectPerformance() {
    try {
        console.log('--- Inspecting Performance Data ---');

        const weeklyData = await pool.query('SELECT COUNT(*) FROM performance_weekly_data');
        console.log(`performance_weekly_data: ${weeklyData.rows[0].count} records`);

        const monthlyApprovals = await pool.query('SELECT COUNT(*) FROM performance_monthly_approvals');
        console.log(`performance_monthly_approvals: ${monthlyApprovals.rows[0].count} records`);

        const appraisals = await pool.query('SELECT COUNT(*) FROM performance_appraisals');
        console.log(`performance_appraisals: ${appraisals.rows[0].count} records`);

        const components = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%performance%'");
        console.log('Performance Salary Components:', components.rows);

        if (components.rows.length > 0) {
            const componentIds = components.rows.map(c => c.id);
            const overrides = await pool.query(`SELECT COUNT(*) FROM monthly_salary_overrides WHERE component_id = ANY($1)`, [componentIds]);
            console.log(`monthly_salary_overrides (Performance): ${overrides.rows[0].count} records`);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspectPerformance();
