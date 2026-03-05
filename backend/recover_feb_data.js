const db = require('./config/db');
require('dotenv').config();

async function restore() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Starting February Performance Data Recovery ---');

        // 0. Restore Missing Metrics
        console.log('Restoring missing performance metrics...');
        await client.query(`
            INSERT INTO performance_metrics (id, name, created_at)
            VALUES 
                (1, 'LOAN AMOUNT', '2026-02-20 15:02:52'),
                (3, 'TOTAL CUSTOMER', '2026-02-20 15:02:52')
            ON CONFLICT (id) DO NOTHING
        `);

        // 1. Restore Targets for Employee 28 and 29
        console.log('Restoring targets for Employee 28 and 29...');
        await client.query(`
            INSERT INTO employee_performance_targets (employee_id, metric_id, mark, min_value, max_value, is_descending, created_at, updated_at)
            VALUES 
                (28, 1, 1, 100000, 200000, false, '2026-02-20 15:39:05.58', '2026-02-20 15:39:05.58'),
                (29, 1, 1, 50000, 100000, false, '2026-02-20 15:39:05.62', '2026-02-20 15:39:05.62')
            ON CONFLICT DO NOTHING
        `);

        // 2. Restore Weekly Records for Employee 28
        console.log('Restoring weekly records for Employee 28...');
        await client.query(`
            INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, payroll_month, created_at, updated_at, status)
            VALUES 
                (28, 1, 350000, '2026-02-16', NULL, '2026-02-20 15:11:05.73', '2026-02-20 16:15:52.15', 'Pending'),
                (28, 2, 25000, '2026-02-16', NULL, '2026-02-20 15:11:05.73', '2026-02-20 16:15:52.15', 'Pending')
            ON CONFLICT DO NOTHING
        `);

        // 3. Reset Incorrect February Approvals
        console.log('Resetting incorrect February approvals (to allow re-calculation)...');
        await client.query("DELETE FROM performance_monthly_approvals WHERE month = '2026-02'");

        // 4. Reset February Performance Overrides
        console.log('Resetting February performance overrides to avoid duplicates...');
        await client.query(`
            DELETE FROM monthly_salary_overrides 
            WHERE month = '2026-02' 
            AND (reason ILIKE '%performance%' OR component_id IN (SELECT id FROM salary_components WHERE name ILIKE '%performance%'))
        `);

        await client.query('COMMIT');
        console.log('--- Recovery Completed Successfully ---');
        process.exit(0);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('RESTORE FAILED:', e);
        process.exit(1);
    } finally {
        client.release();
    }
}
restore();
