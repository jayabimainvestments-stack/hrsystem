const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const query = "SELECT id, month, type, status, data FROM financial_requests WHERE month = '2026-02' AND type ILIKE '%Fuel%'";
        const res = await pool.query(query);
        console.log('--- February Fuel Allowance Requests ---');
        console.table(res.rows.map(r => ({ ...r, data: 'JSON DATA' })));

        if (res.rows.length > 0) {
            console.log('\n--- Details of Pending/Approved Requests ---');
            res.rows.forEach(r => {
                console.log(`ID: ${r.id}, Status: ${r.status}`);
            });
        }
    } catch (e) {
        console.error('Error fetching requests:', e);
    } finally {
        await pool.end();
    }
}

check();
