const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function debugMayuri() {
    const employeeId = 6; // Mayuri
    const month = '2026-02';

    try {
        console.log(`\n=== DEBUGGING SUMMARY FOR MAYURI (ID ${employeeId}) FOR ${month} ===`);

        // 0. Check approval
        const approvalRes = await pool.query('SELECT status FROM performance_monthly_approvals WHERE employee_id = $1 AND month = $2', [employeeId, month]);
        const isApproved = approvalRes.rows.length > 0 && approvalRes.rows[0].status === 'Approved';
        console.log(`Is Approved for Feb: ${isApproved}`);

        // 1. Weekly Data Query
        let query = `
            SELECT wd.*, m.name as metric_name
            FROM performance_weekly_data wd
            JOIN performance_metrics m ON wd.metric_id = m.id
            WHERE wd.employee_id = $1 
              AND (wd.payroll_month = $2 ${!isApproved ? "OR wd.status = 'Pending'" : ""})
        `;
        const weeklyData = await pool.query(query, [employeeId, month]);
        console.log(`Found ${weeklyData.rows.length} weekly data entries.`);

        // 2. Targets
        const targetsRes = await pool.query(
            'SELECT * FROM employee_performance_targets WHERE employee_id = $1',
            [employeeId]
        );
        console.log(`Found ${targetsRes.rows.length} targets for Mayuri.`);

        // 3. Calculation logic (exactly as in controller)
        const metricsRes = await pool.query('SELECT * FROM performance_metrics');
        const pointValue = 1000;

        const employeeMetrics = metricsRes.rows.filter(m => {
            return targetsRes.rows.some(t => parseInt(t.metric_id) === parseInt(m.id));
        });
        console.log(`Employee is assigned to ${employeeMetrics.length} metrics.`);

        const metricsMap = {};
        employeeMetrics.forEach(m => {
            const mTargets = targetsRes.rows.filter(t => parseInt(t.metric_id) === parseInt(m.id));
            metricsMap[m.id] = {
                metric_id: m.id,
                metric_title: m.name,
                score: 0,
                max_marks: Math.max(...mTargets.map(t => parseFloat(t.mark)), 0),
                payout: 0
            };
        });

        weeklyData.rows.forEach(wd => {
            const metricTargets = targetsRes.rows.filter(t => parseInt(t.metric_id) === parseInt(wd.metric_id));
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
                console.log(`Record ID ${wd.id}: Val ${val} matches target for ${mark} pts.`);
            } else {
                console.log(`Record ID ${wd.id}: Metric ${wd.metric_id} (${wd.metric_name}) NOT in metricsMap!`);
            }
        });

        console.log(`FINAL TOTAL MARKS: ${Object.values(metricsMap).reduce((acc, curr) => acc + curr.score, 0)}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debugMayuri();
