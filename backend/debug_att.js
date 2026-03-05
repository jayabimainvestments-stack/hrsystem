const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const res = await pool.query("DELETE FROM attendance WHERE date::date = '2026-02-17' AND status = 'Absent' AND source = 'System'");
        console.log(`Deleted ${res.rowCount} premature absent record(s) for 2/17`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
