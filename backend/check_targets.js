const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT ept.*, u.name as employee_name, pm.name as metric_name FROM employee_performance_targets ept JOIN employees e ON ept.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN performance_metrics pm ON ept.metric_id = pm.id");
        console.log('Employee Performance Targets:', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
