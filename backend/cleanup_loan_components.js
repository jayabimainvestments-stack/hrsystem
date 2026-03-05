const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanupLoans() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Deleting redundant "Staff Loan" (ID 27) component...');

        // 1. Remove any stray assignments if they exist (audit said 0, but let's be safe)
        await client.query('DELETE FROM employee_salary_structure WHERE component_id = 27');

        // 2. Delete the component itself
        await client.query("DELETE FROM salary_components WHERE id = 27 AND name = 'Staff Loan'");

        await client.query('COMMIT');
        console.log('Cleanup completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during cleanup:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

cleanupLoans();
