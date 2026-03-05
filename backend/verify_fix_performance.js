const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function verify() {
    try {
        const month = '2026-01'; // Since I saw data for 2026-01 in performance_weekly_data

        console.log(`Checking monthly performance data for ${month}...`);

        // We'll simulate what the controller does but directly in SQL to see if it works
        // or we could try to hit the API if the server is running, but direct DB check of the logic is safer for verification here.

        // 1. Get Employees
        const employeesRes = await pool.query(`
            SELECT e.id, u.name
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);

        // 2. Get Targets
        const targetsRes = await pool.query('SELECT * FROM employee_performance_targets');

        // 3. Get point value
        const pointValueRes = await pool.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        // 4. Get Weekly Data
        const weeklyDataRes = await pool.query(`
            SELECT wd.employee_id, wd.metric_id, wd.value, wd.week_starting, wd.status
            FROM performance_weekly_data wd
            WHERE wd.payroll_month = $1 OR wd.status = 'Pending'
        `, [month]);

        console.log(`Found ${employeesRes.rows.length} employees, ${targetsRes.rows.length} targets, and ${weeklyDataRes.rows.length} weekly data entries.`);

        const report = [];
        for (const emp of employeesRes.rows) {
            const empWeekly = weeklyDataRes.rows.filter(wd => wd.employee_id === emp.id);
            let totalMarks = 0;

            empWeekly.forEach(wd => {
                const metricTargets = targetsRes.rows.filter(t => t.employee_id === emp.id && t.metric_id === wd.metric_id);
                let mark = 0;
                const val = parseFloat(wd.value);
                for (const t of metricTargets) {
                    if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                        mark = parseFloat(t.mark);
                        break;
                    }
                }
                totalMarks += mark;
            });

            if (totalMarks > 0) {
                report.push({
                    name: emp.name,
                    total_marks: totalMarks,
                    total_amount: totalMarks * pointValue
                });
            }
        }

        if (report.length > 0) {
            console.log('--- Verification Successful: Data found and aggregated ---');
            console.table(report);
        } else {
            console.warn('!!! No aggregated data found. Check if targets are correctly assigned to employees with weekly data !!!');

            // Debug: Check a specific employee
            if (weeklyDataRes.rows.length > 0) {
                const sampleEmpId = weeklyDataRes.rows[0].employee_id;
                const sampleTargets = targetsRes.rows.filter(t => t.employee_id === sampleEmpId);
                console.log(`Debug: Employee ID ${sampleEmpId} has ${sampleTargets.length} targets.`);
                if (sampleTargets.length === 0) {
                    console.log('Reason: No targets found for employee with weekly data.');
                }
            }
        }

    } catch (e) {
        console.error('Verification failed with error:', e);
    } finally {
        await pool.end();
    }
}
verify();
