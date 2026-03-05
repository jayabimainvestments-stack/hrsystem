const db = require('./config/db');

async function run() {
    const month = '2026-02';
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const employeesRes = await client.query(`
            SELECT e.id, e.nic_passport as code, u.name, e.department
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);

        console.log(`Found ${employeesRes.rows.length} active employees`);

        const weeklyDataRes = await client.query(`
            SELECT wd.employee_id, wd.metric_id, wd.value, wd.week_starting
            FROM performance_weekly_data wd
            WHERE TO_CHAR(wd.week_starting, 'YYYY-MM') = $1
        `, [month]);

        console.log(`Found ${weeklyDataRes.rows.length} weekly data rows`);

        const targetsRes = await client.query('SELECT * FROM employee_performance_targets');
        const pointValueRes = await client.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        const perfComponentRes = await client.query(`
            SELECT id, name FROM salary_components 
            WHERE LOWER(name) LIKE '%performance%' AND status = 'Active'
            ORDER BY CASE WHEN LOWER(name) LIKE '%monthly%' THEN 0 ELSE 1 END, name
            LIMIT 1
        `);

        if (perfComponentRes.rows.length === 0) {
            console.log('NO PERFORMANCE COMPONENT FOUND');
            await client.query('ROLLBACK');
            return;
        }

        const perfComponentId = perfComponentRes.rows[0].id;
        console.log(`Target Component: ${perfComponentRes.rows[0].name} (ID: ${perfComponentId})`);

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

            const totalAmount = totalMarks * pointValue;
            if (totalAmount === 0) continue;

            console.log(`Processing ${emp.name} (ID: ${emp.id}): Marks=${totalMarks}, Amount=${totalAmount}`);

            await client.query(`
                INSERT INTO performance_monthly_approvals (employee_id, month, total_marks, total_amount, status, approved_by, approved_at)
                VALUES ($1, $2, $3, $4, 'Approved', 1, NOW())
                ON CONFLICT (employee_id, month)
                DO UPDATE SET 
                    total_marks = EXCLUDED.total_marks,
                    total_amount = EXCLUDED.total_amount,
                    status = 'Approved',
                    approved_at = NOW()
            `, [emp.id, month, totalMarks, totalAmount]);

            const existingStructure = await client.query(
                'SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                [emp.id, perfComponentId]
            );

            if (existingStructure.rows.length > 0) {
                console.log(`  Updating existing structure for component ${perfComponentId}`);
                await client.query(
                    'UPDATE employee_salary_structure SET amount = $1 WHERE employee_id = $2 AND component_id = $3',
                    [totalAmount, emp.id, perfComponentId]
                );
            } else {
                console.log(`  Inserting new structure for component ${perfComponentId}`);
                await client.query(
                    'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)',
                    [emp.id, perfComponentId, totalAmount]
                );
            }
        }

        await client.query('COMMIT');
        console.log('TRANSCTION COMMITTED');
        process.exit(0);
    } catch (e) {
        console.error('ERROR IN TRANS:', e);
        await client.query('ROLLBACK');
        process.exit(1);
    } finally {
        client.release();
    }
}
run();
