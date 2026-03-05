const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
    try {
        await pool.query('BEGIN');

        console.log('--- Cleaning Up employee_salary_structure ---');
        const essDel = await pool.query('DELETE FROM employee_salary_structure');
        console.log(`Deleted ${essDel.rowCount} records from employee_salary_structure.`);

        console.log('\n--- Cleaning Up Salary Advance history in financial_requests ---');
        const frDel = await pool.query("DELETE FROM financial_requests WHERE type ILIKE '%advance%'");
        console.log(`Deleted ${frDel.rowCount} records from financial_requests.`);

        console.log('\n--- Identifying Salary Advance Component IDs ---');
        const compRes = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%advance%'");
        const compIds = compRes.rows.map(r => r.id);
        console.log(`Advancce Component IDs: ${compIds.join(', ')}`);

        if (compIds.length > 0) {
            console.log('\n--- Cleaning Up Advance Overrides in monthly_salary_overrides ---');
            const moDel = await pool.query('DELETE FROM monthly_salary_overrides WHERE component_id = ANY($1)', [compIds]);
            console.log(`Deleted ${moDel.rowCount} records from monthly_salary_overrides.`);
        } else {
            console.log('No advance components found to clean up in monthly_salary_overrides.');
        }

        await pool.query('COMMIT');
        console.log('\nCleanup completed successfully.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Cleanup failed:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
