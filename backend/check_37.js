const db = require('./config/db');
const val = 37;

const check = async () => {
    try {
        const emp = await db.query('SELECT * FROM employees WHERE id = $1 OR user_id = $1 OR employee_id = $2', [val, String(val)]);
        console.log('Employees:', JSON.stringify(emp.rows, null, 2));

        const user = await db.query('SELECT * FROM users WHERE id = $1', [val]);
        console.log('Users:', JSON.stringify(user.rows, null, 2));

        const payroll = await db.query('SELECT * FROM payroll WHERE id = $1 OR user_id = $1', [val]);
        console.log('Payroll:', JSON.stringify(payroll.rows, null, 2));

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
