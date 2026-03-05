const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const metrics = await pool.query("SELECT * FROM performance_metrics");
        const ranges = await pool.query("SELECT * FROM performance_metric_ranges");
        console.log('Metrics:', JSON.stringify(metrics.rows, null, 2));
        console.log('Ranges:', JSON.stringify(ranges.rows, null, 2));

        // Also check if there are any specific settings for the 1000 per mark rate
        const settings = await pool.query("SELECT * FROM performance_settings");
        console.log('Settings:', JSON.stringify(settings.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
