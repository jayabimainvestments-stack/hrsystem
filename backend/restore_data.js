const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function restore() {
    try {
        await pool.query("DELETE FROM performance_weekly_data WHERE employee_id = 7");
        await pool.query("DELETE FROM performance_monthly_approvals WHERE month = '2026-02'");

        // Find performance component id
        const compRes = await pool.query("SELECT id FROM salary_components WHERE name = 'Performance Allowance' LIMIT 1");
        if (compRes.rows.length > 0) {
            await pool.query("DELETE FROM monthly_salary_overrides WHERE month = '2026-02' AND component_id = $1", [compRes.rows[0].id]);
        }

        await pool.query(`
            INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, week_ending, recorded_by, status) 
            VALUES 
            (7, 1, 51834, '2026-01-18', '2026-01-22', 18, 'Pending'), 
            (7, 2, 432508, '2026-01-18', '2026-01-22', 18, 'Pending')
        `);
        console.log('Restored Pradeep records safely.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
restore();
