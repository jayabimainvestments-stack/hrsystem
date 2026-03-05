const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT ess.*, u.name as employee_name, sc.name as component_name FROM employee_salary_structure ess JOIN employees e ON ess.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN salary_components sc ON ess.component_id = sc.id");
        console.log('Employee Salary Structure (Baseline):', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
