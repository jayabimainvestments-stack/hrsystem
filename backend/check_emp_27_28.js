const db = require('./config/db');
db.query(`SELECT e.id, u.name, e.employee_id as emp_code, e.designation FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id IN (27, 28)`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); });
