const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        const res = await pool.query("SELECT * FROM employee_performance_targets WHERE employee_id = 2");
        console.log('Krishantha Targets:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
