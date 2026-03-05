const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        await pool.query('BEGIN');

        console.log('Converting attendance.date to DATE type...');

        // 1. Update existing data to ensure it's normalized to local midnight if needed
        // (Postgres will handle the cast from timestamp to date by truncating time)
        await pool.query('ALTER TABLE attendance ALTER COLUMN date TYPE DATE');

        console.log('Migration successful.');
        await pool.query('COMMIT');
        process.exit(0);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
