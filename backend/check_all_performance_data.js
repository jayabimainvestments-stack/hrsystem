const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        const res = await pool.query("SELECT wd.*, u.name FROM performance_weekly_data wd JOIN employees e ON wd.employee_id = e.id JOIN users u ON e.user_id = u.id");
        console.log('All Weekly Data:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
