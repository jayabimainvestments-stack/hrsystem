const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCols() {
    try {
        const res = await pool.query("SELECT * FROM employees LIMIT 1");
        console.log(Object.keys(res.rows[0]));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkCols();
