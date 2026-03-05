const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        const metrics = await pool.query("SELECT * FROM performance_metrics");
        console.log('Metrics:', JSON.stringify(metrics.rows, null, 2));

        const settings = await pool.query("SELECT * FROM performance_settings");
        console.log('Settings:', JSON.stringify(settings.rows, null, 2));

        const targets = await pool.query("SELECT * FROM employee_performance_targets LIMIT 10");
        console.log('Targets (Sample):', JSON.stringify(targets.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
