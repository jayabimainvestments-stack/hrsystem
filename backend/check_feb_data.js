const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        console.log('--- Checking February 2026 Data ---');
        const month = '2026-02';

        const overrides = await db.query('SELECT * FROM monthly_salary_overrides WHERE month = $1', [month]);
        console.log(`monthly_salary_overrides for ${month}:`, overrides.rows);

        const approvals = await db.query('SELECT * FROM performance_monthly_approvals WHERE month = $1', [month]);
        console.log(`performance_monthly_approvals for ${month}:`, approvals.rows);

        const weekly = await db.query("SELECT COUNT(*) FROM performance_weekly_data WHERE payroll_month = $1 AND status = 'Processed'", [month]);
        console.log(`Processed weekly data for ${month}:`, weekly.rows[0].count);

        const components = await db.query("SELECT id, name FROM salary_components WHERE name ILIKE '%performance%'");
        console.log('Performance Salary Components:', components.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
