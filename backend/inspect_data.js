const db = require('./config/db');

async function checkData() {
    try {
        console.log("--- Employees ---");
        const empRes = await db.query('SELECT * FROM employees LIMIT 5');
        console.table(empRes.rows);

        console.log("\n--- Employee Salary Structure ---");
        const salRes = await db.query('SELECT * FROM employee_salary_structure LIMIT 5');
        console.table(salRes.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();
