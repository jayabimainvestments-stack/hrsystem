const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function debugMayuri() {
    const employeeId = 12; // Mayuri
    const months = ['2026-01', '2026-02'];

    try {
        for (const month of months) {
            console.log(`\n=== DEBUGGING SUMMARY FOR MAYURI (ID ${employeeId}) FOR ${month} ===`);

            // 0. Check approval
            const approvalRes = await pool.query('SELECT status FROM performance_monthly_approvals WHERE employee_id = $1 AND month = $2', [employeeId, month]);
            const isApproved = approvalRes.rows.length > 0 && approvalRes.rows[0].status === 'Approved';
            console.log(`Is Approved: ${isApproved}`);

            // 1. Weekly Data Query (Simulated from controller)
            let query = `
                SELECT wd.*, m.name as metric_name
                FROM performance_weekly_data wd
                JOIN performance_metrics m ON wd.metric_id = m.id
                WHERE wd.employee_id = $1 
                  AND (wd.payroll_month = $2 ${!isApproved ? "OR wd.status = 'Pending'" : ""})
            `;
            const weeklyData = await pool.query(query, [employeeId, month]);
            console.log(`Found ${weeklyData.rows.length} weekly data entries.`);
            if (weeklyData.rows.length > 0) {
                console.table(weeklyData.rows.map(r => ({
                    id: r.id,
                    metric: r.metric_name,
                    val: r.value,
                    start: r.week_starting,
                    status: r.status,
                    payroll: r.payroll_month
                })));
            }

            // 2. Targets
            const targetsRes = await pool.query(
                'SELECT * FROM employee_performance_targets WHERE employee_id = $1',
                [employeeId]
            );
            console.log(`Found ${targetsRes.rows.length} targets for Mayuri.`);
            if (targetsRes.rows.length > 0) {
                console.table(targetsRes.rows.map(r => ({
                    metric_id: r.metric_id,
                    mark: r.mark,
                    min: r.min_value,
                    max: r.max_value
                })));
            }

            // 3. Score Calculation
            let totalMarks = 0;
            weeklyData.rows.forEach(wd => {
                const metricTargets = targetsRes.rows.filter(t => t.metric_id === wd.metric_id);
                let mark = 0;
                const val = parseFloat(wd.value);
                for (const t of metricTargets) {
                    if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                        mark = parseFloat(t.mark);
                        break;
                    }
                }
                totalMarks += mark;
                console.log(`Entry ID ${wd.id}: Value ${val} for Metric ${wd.metric_name} earned ${mark} marks.`);
            });
            console.log(`TOTAL MARKS CALCULATED: ${totalMarks}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debugMayuri();
