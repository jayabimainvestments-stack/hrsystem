const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5433/hr_db'
});

async function verifySystemHealth() {
    try {
        console.log('--- SYSTEM HEALTH CHECK ---');

        const tables = ['users', 'employees', 'salary_components', 'performance_weekly_data', 'performance_appraisals'];

        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table "${table}": ${res.rows[0].count} records`);
            } catch (e) {
                console.log(`Table "${table}": ERROR (${e.message})`);
            }
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

verifySystemHealth();
