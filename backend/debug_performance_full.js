const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function debug() {
    try {
        console.log('--- performance_weekly_data ---');
        const resWeekly = await pool.query(`
            SELECT wd.*, u.name 
            FROM performance_weekly_data wd 
            LEFT JOIN employees e ON wd.employee_id = e.id 
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY wd.week_ending DESC
            LIMIT 20
        `);
        console.table(resWeekly.rows);

        console.log('\n--- performance_monthly_approvals ---');
        const resMonthly = await pool.query(`
            SELECT ma.*, u.name 
            FROM performance_monthly_approvals ma 
            LEFT JOIN employees e ON ma.employee_id = e.id 
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY ma.month DESC
            LIMIT 20
        `);
        console.table(resMonthly.rows);

        console.log('\n--- monthly_salary_overrides (perfomance field) ---');
        const resOverrides = await pool.query(`
            SELECT mo.*, u.name 
            FROM monthly_salary_overrides mo 
            LEFT JOIN employees e ON mo.employee_id = e.id 
            LEFT JOIN users u ON e.user_id = u.id
            WHERE mo.monthly_perfomance > 0 OR mo.monthly_perfomance IS NOT NULL
            ORDER BY mo.month DESC
            LIMIT 20
        `);
        console.table(resOverrides.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debug();
