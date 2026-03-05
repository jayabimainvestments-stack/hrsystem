const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function verify() {
    try {
        console.log('--- Verifying Component Lookups ---');

        const loanRes = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE 'STAFF LOAN INSTALLMENT'");
        console.log('Loan Component:', loanRes.rows[0] || 'NOT FOUND');

        const basicRes = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE 'Basic pay' OR name ILIKE 'Basic Salary'");
        console.log('Basic Component:', basicRes.rows[0] || 'NOT FOUND');

        if (loanRes.rows.length > 0 && basicRes.rows.length > 0) {
            console.log('\nSUCCESS: Both lookups are working correctly with ILIKE.');
        } else {
            console.log('\nFAILURE: One or more lookups failed.');
        }

    } catch (e) {
        console.error('Verification Error:', e);
    } finally {
        await pool.end();
    }
}

verify();
