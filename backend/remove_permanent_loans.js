const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function cleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Removing STAFF LOAN INSTALLMENT from employee_salary_structure...');
        const resStructure = await client.query('DELETE FROM employee_salary_structure WHERE component_id = 25');
        console.log(`Deleted ${resStructure.rowCount} permanent structure records.`);

        console.log('2. Clearing employee_loans table...');
        const resLoans = await client.query('DELETE FROM employee_loans');
        console.log(`Deleted ${resLoans.rowCount} loan records.`);

        await client.query('COMMIT');
        console.log('SUCCESS: All permanent staff loan components and records removed.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('ERROR during cleanup:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
