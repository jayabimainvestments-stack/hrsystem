const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function revert() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Starting Reversal Process ---');

        // 1. Get Employee IDs from Approved Requests (3 and 4)
        const reqRes = await client.query("SELECT id, data FROM financial_requests WHERE id IN (3, 4)");
        let allEmployeeIds = new Set();

        for (const row of reqRes.rows) {
            const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            data.forEach(item => allEmployeeIds.add(item.employee_id));
        }

        const employeeIdArray = Array.from(allEmployeeIds);
        console.log(`Found ${employeeIdArray.length} unique employees to revert.`);

        if (employeeIdArray.length > 0) {
            // 2. Revert Salary Structure (Component ID 1: Monthly Fuel)
            const revertRes = await client.query(`
                UPDATE employee_salary_structure 
                SET amount = 0, is_locked = false, lock_reason = NULL 
                WHERE component_id = 1 AND employee_id = ANY($1)
            `, [employeeIdArray]);
            console.log(`Updated ${revertRes.rowCount} salary structure entries.`);
        }

        // 3. Delete Financial Requests (3, 4, 5)
        const deleteRes = await client.query("DELETE FROM financial_requests WHERE id IN (3, 4, 5)");
        console.log(`Deleted ${deleteRes.rowCount} financial requests.`);

        await client.query('COMMIT');
        console.log('\n--- Reversal Completed Successfully ---');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error during reversal:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

revert();
