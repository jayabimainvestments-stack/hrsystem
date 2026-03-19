const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function listTables() {
    try {
        const res = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.table(res.rows);
    } catch (err) {
        console.error('[ERR]', err.message);
    } finally {
        pool.end();
    }
}

listTables();
