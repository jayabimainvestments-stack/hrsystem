const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    try {
        console.log('--- All Loan and Advance Components ---');
        const res = await pool.query("SELECT id, name, type, status FROM salary_components WHERE name ILIKE '%Loan%' OR name ILIKE '%Advance%' ORDER BY name");
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
