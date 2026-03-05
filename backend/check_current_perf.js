const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT pwd.*, u.name as employee_name, pm.name as metric_name FROM performance_weekly_data pwd JOIN employees e ON pwd.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN performance_metrics pm ON pwd.metric_id = pm.id WHERE week_starting >= '2026-02-01'");
        console.log('Current February Weekly Data:', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
