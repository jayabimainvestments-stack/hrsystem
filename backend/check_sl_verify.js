require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

async function check() {
    try {
        console.log("Checking Payrolls...");
        const p = await db.query("SELECT * FROM payroll");
        console.table(p.rows);

        console.log("Checking Users...");
        const u = await db.query("SELECT * FROM users WHERE name ILIKE '%SL%' OR name ILIKE '%VERIFY%'");
        console.table(u.rows);

        console.log("Checking Employees...");
        const e = await db.query("SELECT * FROM employees WHERE employee_id ILIKE '%SL%' OR employee_id ILIKE '%VERIFY%'");
        console.table(e.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
