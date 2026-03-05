const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const u = await pool.query("SELECT COUNT(*) FROM users");
        console.log('Total Users:', u.rows[0].count);

        const e = await pool.query("SELECT COUNT(*) FROM employees");
        console.log('Total Employees:', e.rows[0].count);

        const l = await pool.query("SELECT COUNT(*) FROM leaves");
        console.log('Total Leaves:', l.rows[0].count);

        const a = await pool.query("SELECT COUNT(*) FROM attendance");
        console.log('Total Attendance:', a.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
