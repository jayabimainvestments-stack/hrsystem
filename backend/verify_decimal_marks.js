const db = require('./config/db');
const { getPerformanceSummary, saveEmployeePerformanceConfig } = require('./controllers/performance.controller');

async function verify() {
    console.log('--- Verification Started ---');
    try {
        const employeeId = 3; // Using a known employee ID from previous checks
        const metricId = 1; // Assuming 'Loan Amount' or similar exists

        // Mock request for saving setup with decimal marks
        const saveReq = {
            params: { employeeId },
            body: {
                targets: [
                    { metric_id: metricId, mark: 0.5, min_value: 0, max_value: 1000, is_descending: false },
                    { metric_id: metricId, mark: 1.5, min_value: 1001, max_value: 5000, is_descending: false }
                ]
            }
        };
        const saveRes = { status: (s) => ({ json: (j) => console.log('Save Result:', j) }) };

        console.log('1. Testing saveEmployeePerformanceConfig with decimal marks...');
        await saveEmployeePerformanceConfig(saveReq, saveRes);

        // Verify in DB
        const dbResult = await db.query('SELECT * FROM employee_performance_targets WHERE employee_id = $1 AND metric_id = $2', [employeeId, metricId]);
        console.log('2. Database Records:', dbResult.rows.map(r => ({ mark: r.mark, min: r.min_value, max: r.max_value })));

        // Mock entry for weekly data
        console.log('3. Testing summary calculation with decimal marks...');
        await db.query('DELETE FROM performance_weekly_data WHERE employee_id = $1 AND metric_id = $2', [employeeId, metricId]);
        await db.query('INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, recorded_by) VALUES ($1, $2, $3, $4, $5)',
            [employeeId, metricId, 500, '2026-02-16', 1]);

        const sumReq = { params: { employeeId, month: '2026-02' } };
        const sumRes = {
            status: (s) => ({
                json: (j) => {
                    console.log('4. Summary Calculation Result:');
                    console.log('Total Marks:', j.total_marks);
                    console.log('Total Amount:', j.total_amount);
                    if (j.total_marks === 0.5) console.log('✅ Correct mark (0.5) calculated!');
                    else console.log('❌ Incorrect mark calculated:', j.total_marks);
                }
            })
        };

        await getPerformanceSummary(sumReq, sumRes);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        // Cleanup test data
        // await db.query('DELETE FROM employee_performance_targets WHERE employee_id = 3 AND metric_id = 1');
        process.exit(0);
    }
}

verify();
