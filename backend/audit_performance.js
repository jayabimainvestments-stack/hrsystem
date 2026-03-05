const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function audit() {
    try {
        console.log('--- PERFORMANCE DATA AUDIT ---');

        const weekly = await pool.query(`
            SELECT wd.*, e.name as employee_name
            FROM performance_weekly_data wd
            JOIN employees e ON wd.employee_id = e.id
            ORDER BY wd.created_at DESC
            LIMIT 20
        `);

        console.table(weekly.rows.map(r => ({
            id: r.id,
            emp: r.employee_name,
            week: r.week_starting,
            val: r.value,
            status: r.status,
            month: r.payroll_month,
            created: r.created_at.toISOString()
        })));

        const approvals = await pool.query(`
            SELECT * FROM performance_monthly_approvals
            ORDER BY month DESC
        `);
        console.log('\n--- MONTHLY APPROVALS ---');
        console.table(approvals.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
audit();
