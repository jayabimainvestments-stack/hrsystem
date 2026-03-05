const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifySalary() {
    try {
        const res = await pool.query(`
            SELECT ess.amount, sc.name 
            FROM employee_salary_structure ess
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE ess.employee_id = 2 AND sc.name = 'No Pay'
        `);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
verifySalary();
