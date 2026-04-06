const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5433/hr_db'
});

async function checkData() {
    try {
        const res = await pool.query('SELECT COUNT(*) FROM performance_weekly_data');
        console.log(`Total performance_weekly_data records: ${res.rows[0].count}`);

        const latest = await pool.query('SELECT * FROM performance_weekly_data ORDER BY created_at DESC LIMIT 5');
        console.log('Latest records:', JSON.stringify(latest.rows, null, 2));

    } catch (err) {
        console.error('Error connecting to DB:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
