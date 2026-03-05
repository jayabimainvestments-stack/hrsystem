const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT mo.*, u.name as employee_name, sc.name as component_name FROM monthly_salary_overrides mo JOIN employees e ON mo.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN salary_components sc ON mo.component_id = sc.id WHERE mo.month = '2026-02'");
        console.log('February Overrides:', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
