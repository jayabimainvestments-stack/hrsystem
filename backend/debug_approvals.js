const db = require('./config/db');

async function check() {
    try {
        const month = '2026-02';

        // 1. Get all employees (Using the fixed query)
        const employeesRes = await db.query(`
            SELECT e.id, e.nic_passport as code, u.name, e.department
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);
        console.log('Active employees found:', employeesRes.rows.length);

        // 2. Get all monthly data for this month
        const weeklyDataRes = await db.query(`
            SELECT wd.employee_id, wd.metric_id, wd.value, wd.week_starting
            FROM performance_weekly_data wd
            WHERE TO_CHAR(wd.week_starting, 'YYYY-MM') = $1
        `, [month]);
        console.log('Weekly data rows for 2026-02:', weeklyDataRes.rows.length);

        // 3. Get all targets
        const targetsRes = await db.query('SELECT * FROM employee_performance_targets');

        // 4. Get point value
        const pointValueRes = await db.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        // 5. Aggregate logic (simulated from controller)
        const report = employeesRes.rows.map(emp => {
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

            return {
                name: emp.name,
                code: emp.code,
                total_marks: totalMarks,
                total_amount: totalMarks * pointValue
            };
        });

        const activeRecords = report.filter(r => r.total_marks > 0);
        console.log('Employees with marks > 0:');
        activeRecords.forEach(r => console.log(`  ${r.name} (${r.code}): Marks=${r.total_marks}, Amount=${r.total_amount}`));

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
check();
