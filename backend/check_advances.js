const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkAdvances() {
    try {
        console.log('\n--- Financial Requests ---');
        const finRes = await pool.query("SELECT * FROM financial_requests WHERE type ILIKE '%advance%' OR data::text ILIKE '%advance%'");
        finRes.rows.forEach(row => {
            console.log(`ID: ${row.id}, Month: ${row.month}, Type: ${row.type}, Status: ${row.status}`);
            console.log('Data:', JSON.stringify(row.data, null, 2));
        });

        console.log('\n--- Monthly Overrides for component 22 ---');
        // Check if there are any overrides using the 'SALARY ADVANCE AND OTHERS' component (ID 22)
        const overrideRes = await pool.query("SELECT * FROM monthly_salary_overrides WHERE component_id = 22");
        console.log(overrideRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAdvances();
