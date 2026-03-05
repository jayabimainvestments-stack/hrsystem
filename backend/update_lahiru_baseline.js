const { Client } = require('pg');
require('dotenv').config();

async function updateStructure() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // 1. Update Monthly Fuel amount
        console.log('Updating Monthly Fuel amount to 18980.00 for employee 30...');
        const fuelRes = await client.query(`
            UPDATE employee_salary_structure 
            SET amount = 18980.00, updated_at = NOW()
            WHERE employee_id = 30 AND component_id = 204
        `);
        console.log(`Updated ${fuelRes.rowCount} Monthly Fuel record.`);

        // 2. Remove Salary Advance from baseline
        console.log('Removing SALARY ADVANCE from structure baseline for employee 30...');
        const advanceRes = await client.query(`
            DELETE FROM employee_salary_structure 
            WHERE employee_id = 30 AND component_id = 214
        `);
        console.log(`Deleted ${advanceRes.rowCount} Salary Advance records from baseline.`);

        await client.query('COMMIT');
        console.log('SUCCESS: Structure updated.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR:', err);
    } finally {
        await client.end();
    }
}

updateStructure();
