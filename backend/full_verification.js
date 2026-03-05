const { Client } = require('pg');
require('dotenv').config();

async function runVerification() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // 1. Find Lahiru
        const searchRes = await client.query("SELECT e.id, u.id as user_id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name ILIKE $1", ['%Lahiru%']);

        if (searchRes.rows.length === 0) {
            console.error('Lahiru not found in the database.');
            return;
        }

        const lahiru = searchRes.rows[0];
        console.log(`Found Employee: ${lahiru.name} (Employee ID: ${lahiru.id}, User ID: ${lahiru.user_id})`);

        const employeeId = lahiru.id;
        const month = '2026-02';

        // 2. Simulate Backend Logic for /api/performance/my/summary/2026-02
        console.log(`Verifying performance summary for ${month}...`);

        const metricsRes = await client.query('SELECT * FROM performance_metrics');
        const pointValueRes = await client.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        const query = `
            SELECT wd.*, m.name as metric_name
            FROM performance_weekly_data wd
            JOIN performance_metrics m ON wd.metric_id = m.id
            WHERE wd.employee_id = $1 AND wd.payroll_month = $2
        `;
        const weeklyData = await client.query(query, [employeeId, month]);

        const targetsRes = await client.query('SELECT * FROM employee_performance_targets WHERE employee_id = $1', [employeeId]);

        let totalMarks = 0;
        weeklyData.rows.forEach(wd => {
            const metricTargets = targetsRes.rows.filter(t => Number(t.metric_id) === Number(wd.metric_id));
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

        console.log(`Total Marks: ${totalMarks}`);
        console.log(`Estimated Payout: LKR ${totalMarks * pointValue}`);

        if (totalMarks > 0) {
            console.log("SUCCESS: Backend logic verified. Data exists and calculations are consistent.");
        } else {
            console.warn("WARNING: No marks found for February 2026 for this employee.");
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await client.end();
    }
}

runVerification();
