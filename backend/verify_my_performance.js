const { Client } = require('pg');
require('dotenv').config();

async function verifyMyPerformance() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Simulating the logic for Lahiru (UserID 16, EmployeeID 3)
        const userId = 16;
        const month = '2026-02';

        console.log(`Checking performance summary for User ID ${userId} for ${month}...`);

        // 1. Get employee ID
        const empRes = await client.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        if (empRes.rows.length === 0) {
            console.error('Employee profile not found');
            return;
        }
        const employeeId = empRes.rows[0].id;
        console.log(`Found Employee ID: ${employeeId}`);

        // 2. Fetch summary logic (simulated)
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

        console.log(`Found ${weeklyData.rows.length} weekly records.`);

        // Aggregate scores
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

        console.log(`Verified Total Marks: ${totalMarks}`);
        console.log(`Verified Projected Payout: LKR ${totalMarks * pointValue}`);

        if (totalMarks === 106) {
            console.log("SUCCESS: Performance summary matches expected verification totals.");
        } else {
            console.warn(`WARNING: Total marks (${totalMarks}) do not match the expected 106.`);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await client.end();
    }
}

verifyMyPerformance();
