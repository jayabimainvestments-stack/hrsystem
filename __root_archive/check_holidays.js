const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkHolidays() {
    try {
        const holidays = await pool.query("SELECT * FROM company_holidays WHERE date::text LIKE '2026-03%'");
        console.log("\nCompany Holidays for March 2026:");
        holidays.rows.forEach(r => console.log(`- ${r.date}: ${r.name}`));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkHolidays();
