const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function swapBA() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Fetching components...');
        const compRes = await client.query("SELECT id, name FROM salary_components WHERE name IN ('Budgetary Allowance 1', 'Budgetary Allowance 2')");
        const ba1 = compRes.rows.find(r => r.name === 'Budgetary Allowance 1');
        const ba2 = compRes.rows.find(r => r.name === 'Budgetary Allowance 2');

        if (!ba1 || !ba2) {
            throw new Error('Budgetary Allowance components not found');
        }

        console.log(`BA1 ID: ${ba1.id}, BA2 ID: ${ba2.id}`);

        const findRes = await client.query(`
            SELECT es1.employee_id, es1.amount as ba1_amount, es2.amount as ba2_amount
            FROM employee_salary_structure es1
            JOIN employee_salary_structure es2 ON es1.employee_id = es2.employee_id
            WHERE es1.component_id = $1 AND es1.amount = 1000
              AND es2.component_id = $2 AND es2.amount = 2500
        `, [ba1.id, ba2.id]);

        console.log(`Found ${findRes.rows.length} employees to swap.`);

        for (const row of findRes.rows) {
            console.log(`Swapping for employee ID: ${row.employee_id}`);
            // Note: We update both to ensure they are swapped.
            await client.query(`UPDATE employee_salary_structure SET amount = 2500 WHERE employee_id = $1 AND component_id = $2`, [row.employee_id, ba1.id]);
            await client.query(`UPDATE employee_salary_structure SET amount = 1000 WHERE employee_id = $1 AND component_id = $2`, [row.employee_id, ba2.id]);
        }

        await client.query('COMMIT');
        console.log('Swap completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during swap:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

swapBA();
