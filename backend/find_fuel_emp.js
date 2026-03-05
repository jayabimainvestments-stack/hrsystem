const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function find() {
    try {
        const res = await pool.query(`
            SELECT u.name, e.id, u.id as user_id 
            FROM users u 
            JOIN employees e ON u.id = e.user_id 
            JOIN employee_salary_structure ess ON e.id = ess.employee_id 
            JOIN salary_components sc ON ess.component_id = sc.id 
            WHERE sc.name ILIKE '%fuel%'
            LIMIT 5;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
find();
