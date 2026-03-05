const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function removeAdvances() {
    try {
        console.log('Starting removal of Salary Advances...');

        // 1. Delete Financial Requests of type 'Salary Advance'
        const finDelRes = await pool.query("DELETE FROM financial_requests WHERE type = 'Salary Advance' RETURNING id, month, type, status");
        console.log(`Deleted ${finDelRes.rowCount} record(s) from financial_requests.`);
        if (finDelRes.rowCount > 0) {
            console.log('Deleted IDs:', finDelRes.rows.map(r => r.id).join(', '));
        }

        // 2. Delete Monthly Overrides that might be advances
        // Even though we didn't find any with component 22, let's be safe and check by reason too
        const overrideDelRes = await pool.query(`
            DELETE FROM monthly_salary_overrides 
            WHERE component_id = 22 
            OR reason ILIKE '%salary advance%' 
            RETURNING id, employee_id, month, reason
        `);
        console.log(`Deleted ${overrideDelRes.rowCount} record(s) from monthly_salary_overrides.`);

        // 3. Delete Pending Changes related to advances
        const pendingDelRes = await pool.query(`
            DELETE FROM pending_changes 
            WHERE reason ILIKE '%salary advance%' 
            OR field_name ILIKE '%salary advance%'
            RETURNING id, reason
        `);
        console.log(`Deleted ${pendingDelRes.rowCount} record(s) from pending_changes.`);

        console.log('Removal complete.');

    } catch (err) {
        console.error('Error during removal:', err);
    } finally {
        await pool.end();
    }
}

removeAdvances();
