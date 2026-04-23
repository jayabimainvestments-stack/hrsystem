const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log('[*] Starting Center Schema Migration...');
        
        const queries = [
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS village VARCHAR(100)`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS gnd VARCHAR(100)`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS ds_division VARCHAR(100)`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS meeting_place TEXT`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS meeting_time TIME`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255)`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 30`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)`,
            `ALTER TABLE mf_centers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)`
        ];

        for (let q of queries) {
            await pool.query(q);
        }

        console.log('[OK] Center Schema Migration completed successfully.');
    } catch (err) {
        console.error('[ERR] Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
