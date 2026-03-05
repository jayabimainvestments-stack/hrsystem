const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT e.id, u.name, e.is_epf_eligible, e.is_etf_eligible 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            ORDER BY u.name
        `);
        res.rows.forEach(r => console.log(`${r.id}|${r.name}|${r.is_epf_eligible}|${r.is_etf_eligible}`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
