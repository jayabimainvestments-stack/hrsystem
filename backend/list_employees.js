const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function listEmployees() {
    try {
        const res = await pool.query(`
            SELECT u.id as user_id, e.id as emp_id, u.name, u.role, u.email 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            ORDER BY u.name
        `);
        console.log('--- ALL EMPLOYEES ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listEmployees();
