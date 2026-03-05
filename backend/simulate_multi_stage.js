const db = require('./config/db');
require('dotenv').config();

async function simulate() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const month = '2026-02';

        console.log('--- Multi-Stage Approval Simulation ---');

        // 1. Check if targets exist for employees
        const empCheck = await client.query('SELECT id FROM employees LIMIT 1');
        if (empCheck.rows.length === 0) {
            console.log('No employees found.');
            await client.query('ROLLBACK');
            process.exit(0);
        }
        const empId = empCheck.rows[0].id;

        // 2. Get Performance Component
        const perfCompRes = await client.query(`
            SELECT id FROM salary_components 
            WHERE LOWER(name) LIKE '%performance%' AND status ILIKE 'active'
            ORDER BY CASE WHEN LOWER(name) LIKE '%monthly%' THEN 0 ELSE 1 END, name
            LIMIT 1
        `);
        const perfCompId = perfCompRes.rows[0]?.id;

        if (!perfCompId) {
            console.log('Performance component not found.');
            await client.query('ROLLBACK');
            process.exit(1);
        }

        // 3. Simulate "Approve All" transfer (creating a Draft override)
        console.log(`Simulation: Creating Draft override for Employee ${empId}...`);
        await client.query(`
            INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, reason, status)
            VALUES ($1, $2, $3, 15000, 'Monthly Performance Marks', 'Draft')
            ON CONFLICT (employee_id, month, component_id)
            DO UPDATE SET status = 'Draft', amount = 15000
        `, [empId, month, perfCompId]);

        // 4. Verify visibility in Governance Hub
        console.log('Checking Governance Hub visibility...');
        const govRes = await client.query(`
            SELECT mo.id, mo.status, tu.name as target_name
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users tu ON e.user_id = tu.id
            WHERE mo.status = 'Draft' AND (mo.reason ILIKE '%performance%' OR mo.component_id IN (SELECT id FROM salary_components WHERE name ILIKE '%performance%'))
        `);

        console.log('Governance Records Found:', govRes.rows);

        if (govRes.rows.length > 0) {
            console.log('SUCCESS: Draft performance overrides are visible in Governance.');
        } else {
            console.log('FAILURE: Draft performance overrides NOT visible in Governance.');
        }

        await client.query('ROLLBACK');
        process.exit(0);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
    }
}
simulate();
