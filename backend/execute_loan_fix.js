const { Client } = require('pg');
require('dotenv').config();

async function fixLahiruLoans() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // 1. Delete duplicate loans
        console.log('Deleting duplicate loans 2 and 3...');
        const deleteRes = await client.query('DELETE FROM employee_loans WHERE id IN (2, 3)');
        console.log(`Deleted ${deleteRes.rowCount} duplicate loan records.`);

        // 2. Update salary structure to point back to Loan ID 1
        console.log('Updating salary structure for employee 30, component 210...');
        const updateRes = await client.query(`
            UPDATE employee_salary_structure 
            SET lock_reason = 'Approved Loan - Ref: 1',
                installments_remaining = 5,
                updated_at = NOW()
            WHERE employee_id = 30 AND component_id = 210
        `);
        console.log(`Updated ${updateRes.rowCount} salary structure entry.`);

        await client.query('COMMIT');
        console.log('SUCCESS: All changes committed.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR during execution:', err);
    } finally {
        await client.end();
    }
}

fixLahiruLoans();
