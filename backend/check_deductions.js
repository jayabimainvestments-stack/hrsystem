const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkComps() {
    try {
        const res = await pool.query("SELECT * FROM salary_components WHERE type = 'Deduction'");
        console.log('Deduction Components:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkComps();
