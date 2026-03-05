const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding fuel_rate_per_liter to attendance_policies...');
        await client.query(`
            ALTER TABLE attendance_policies 
            ADD COLUMN IF NOT EXISTS fuel_rate_per_liter NUMERIC DEFAULT 0
        `);

        console.log('Adding installments_remaining to employee_salary_structure...');
        await client.query(`
            ALTER TABLE employee_salary_structure 
            ADD COLUMN IF NOT EXISTS installments_remaining INTEGER DEFAULT NULL
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
