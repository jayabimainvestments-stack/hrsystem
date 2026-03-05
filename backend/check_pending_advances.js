const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPending() {
    try {
        const res = await pool.query("SELECT * FROM pending_changes WHERE reason ILIKE '%advance%' OR old_value ILIKE '%advance%' OR new_value ILIKE '%advance%'");
        console.log('Pending Changes with "advance":', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkPending();
