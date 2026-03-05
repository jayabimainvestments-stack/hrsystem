const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function verify() {
    try {
        console.log('--- Verifying aggregated summary for Pradeep (ID 7) ---');

        // 1. Check Pradeep's data
        const res = await pool.query(`
            SELECT wd.*, m.name as metric_name
            FROM performance_weekly_data wd
            JOIN performance_metrics m ON wd.metric_id = m.id
            WHERE wd.employee_id = 7 AND status = 'Pending'
        `);
        console.log('Raw weekly data count:', res.rows.length);

        // 2. We'll simulate the controller logic to see if it would aggregate correctly
        // (Full logic already implemented in controller, here we just check if any metrics exist)
        const metricsRes = await pool.query('SELECT * FROM performance_metrics');
        const targetsRes = await pool.query('SELECT * FROM employee_performance_targets WHERE employee_id = 7');
        const pointValueRes = await pool.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        const metricsMap = {};
        const employeeMetrics = metricsRes.rows.filter(m => targetsRes.rows.some(t => t.metric_id === m.id));

        employeeMetrics.forEach(m => {
            const mTargets = targetsRes.rows.filter(t => t.metric_id === m.id);
            metricsMap[m.id] = {
                metric_title: m.name,
                score: 0,
                max_marks: Math.max(...mTargets.map(t => parseFloat(t.mark)), 0)
            };
        });

        res.rows.forEach(wd => {
            const metricTargets = targetsRes.rows.filter(t => t.metric_id === wd.metric_id);
            let mark = 0;
            const val = parseFloat(wd.value);
            for (const t of metricTargets) {
                if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                    mark = parseFloat(t.mark);
                    break;
                }
            }
            if (metricsMap[wd.metric_id]) {
                metricsMap[wd.metric_id].score += mark;
            }
        });

        console.log('Aggregated Dashboard Details:', JSON.stringify(Object.values(metricsMap), null, 2));

        console.log('--- Verification Done ---');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
verify();
