const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function simulateSummary(employeeId, month) {
    try {
        console.log(`\n--- SIMULATING SUMMARY FOR EMP ${employeeId} MONTH ${month} ---`);

        // 0. Metrics
        const metricsRes = await pool.query('SELECT * FROM performance_metrics');

        // 0. Approval
        const approvalRes = await pool.query('SELECT status FROM performance_monthly_approvals WHERE employee_id = $1 AND month = $2', [employeeId, month]);
        const isApproved = approvalRes.rows.length > 0 && approvalRes.rows[0].status === 'Approved';
        console.log(`isApproved: ${isApproved}`);

        // 1. Weekly Data
        let query = `
            SELECT wd.*, m.name as metric_name
            FROM performance_weekly_data wd
            JOIN performance_metrics m ON wd.metric_id = m.id
            WHERE wd.employee_id = $1 
              AND (wd.payroll_month = $2 ${!isApproved ? "OR wd.status = 'Pending'" : ""})
        `;
        const weeklyData = await pool.query(query, [employeeId, month]);
        console.log(`Found ${weeklyData.rows.length} weekly data rows.`);

        // 2. Targets
        const targetsRes = await pool.query(
            'SELECT * FROM employee_performance_targets WHERE employee_id = $1',
            [employeeId]
        );
        console.log(`Found ${targetsRes.rows.length} targets.`);

        // 3. Calculation logic (from controller)
        const metricsMap = {};
        const employeeMetrics = metricsRes.rows.filter(m => {
            // BE CAREFUL WITH TYPES HERE
            const hasTarget = targetsRes.rows.some(t => t.metric_id === m.id);
            if (!hasTarget) {
                // Try with == to check for string/int mismatch
                const hasTargetLoose = targetsRes.rows.some(t => t.metric_id == m.id);
                if (hasTargetLoose) console.log(`Warning: Metric ID ${m.id} matched target metric_id ${targetsRes.rows.find(t => t.metric_id == m.id).metric_id} only with loose equality!`);
            }
            return hasTarget;
        });

        console.log(`Assigned Metrics: ${employeeMetrics.length}`);

        // Group by week
        const weeksMap = {};
        weeklyData.rows.forEach(wd => {
            const weekKey = wd.week_starting;
            if (!weeksMap[weekKey]) {
                weeksMap[weekKey] = {
                    week_starting: wd.week_starting,
                    total_marks: 0,
                    metrics: []
                };
            }
            // Logic continue...
        });

        console.log(`Total Weeks in Breakdown: ${Object.keys(weeksMap).length}`);
        console.log('Weeks identified:', Object.keys(weeksMap));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

simulateSummary(6, '2026-02');
