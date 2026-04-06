const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkFuel() {
    try {
        const fuel = await pool.query("SELECT * FROM fuel_price_history ORDER BY effective_from_date DESC LIMIT 10");
        console.log("\nFuel Price History (Extended):");
        fuel.rows.forEach(r => console.log(`- ${r.price_per_liter} LKR (Effective: ${r.effective_from_date})`));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
checkFuel();
