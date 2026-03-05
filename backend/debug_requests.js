const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        console.log("Checking financial_requests table...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_requests';
        `);
        console.table(res.rows);

        console.log("\nChecking last 5 requests...");
        const data = await pool.query("SELECT id, month, type, requested_by, status FROM financial_requests ORDER BY created_at DESC LIMIT 5");
        console.table(data.rows);

        if (data.rows.length > 0) {
            const firstReq = data.rows[0];
            console.log("\nType of requested_by:", typeof firstReq.requested_by);
        }

        console.log("\nChecking users table for a sample user ID...");
        const userRes = await pool.query("SELECT id, name, role FROM users LIMIT 1");
        console.table(userRes.rows);
        if (userRes.rows.length > 0) {
            console.log("Type of user ID:", typeof userRes.rows[0].id);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
