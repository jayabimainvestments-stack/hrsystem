const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT u.id as user_id, e.id as emp_id, u.name, u.email 
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id 
            ORDER BY u.id ASC
        `);
        console.log('--- ALL USERS AND EMPLOYEES ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
