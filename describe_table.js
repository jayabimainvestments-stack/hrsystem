const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function describeTable() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'financial_requests'
        `);
        console.log("Table Schema (financial_requests):");
        res.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
describeTable();
