const db = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    try {
        const res = await db.query(`
            SELECT DISTINCT dept.name 
            FROM departments dept
            ORDER BY dept.name
        `);
        console.log('Departments:', res.rows.map(r => r.name));

        const res2 = await db.query(`
            SELECT d.title, dept.name as department_name 
            FROM designations d
            JOIN departments dept ON d.department_id = dept.id
            WHERE dept.name = 'Operations'
        `);
        console.log('Operations Roles:', res2.rows.map(r => r.title));

        const res3 = await db.query(`
            SELECT DISTINCT department FROM employees
        `);
        console.log('Employee Departments:', res3.rows.map(r => r.department));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
