const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkIds() {
    try {
        const res = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%fuel%'");
        console.log("Fuel Components:", res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkIds();
