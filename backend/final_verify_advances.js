const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkFinal() {
    try {
        const res = await pool.query("SELECT * FROM salary_components WHERE name ILIKE '%advance%' OR name ILIKE '%අත්තිකාරම්%'");
        console.log('Components matching advance:', res.rows.map(r => r.name));

        const res2 = await pool.query("SELECT * FROM financial_requests WHERE type ILIKE '%advance%' OR type ILIKE '%අත්තිකාරම්%'");
        console.log('Remaining financial requests:', res2.rows);

        const res3 = await pool.query("SELECT * FROM monthly_salary_overrides WHERE reason ILIKE '%advance%' OR reason ILIKE '%අත්තිකාරම්%'");
        console.log('Remaining overrides:', res3.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFinal();
