const db = require('../config/db');

const checkCounts = async () => {
    try {
        const users = await db.query('SELECT count(*) FROM users');
        const employees = await db.query('SELECT count(*) FROM employees');
        const payroll = await db.query('SELECT count(*) FROM payroll');

        console.log(`Users: ${users.rows[0].count}`);
        console.log(`Employees: ${employees.rows[0].count}`);
        console.log(`Payroll Records: ${payroll.rows[0].count}`);

        if (parseInt(employees.rows[0].count) > 0) {
            const empList = await db.query('SELECT id, user_id, designation FROM employees LIMIT 5');
            console.log('Sample Employees:', empList.rows);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkCounts();
