const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function listUsers() {
    try {
        const res = await pool.query("SELECT id, name, role, email FROM users WHERE role IN ('Admin', 'HR Manager')");
        console.log('--- USERS WITH APPROVAL AUTHORITY ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();
