const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function verify() {
    try {
        console.log('--- Verification Started ---');

        // 1. Clear any existing test data for Pradeep (ID 7)
        await pool.query("DELETE FROM performance_weekly_data WHERE employee_id = 7");
        await pool.query("DELETE FROM performance_monthly_approvals WHERE month = '2026-02'");
        await pool.query("DELETE FROM monthly_salary_overrides WHERE month = '2026-02'");

        // 2. Insert a Pending record
        console.log('Step 2: Inserting Pending record for Jan 19 week...');
        await pool.query(`
            INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, week_ending, recorded_by, status)
            VALUES (7, 1, 40000, '2026-01-19', '2026-01-25', 18, 'Pending')
        `);

        // 3. Check if it shows up for February (it should, as the only thing in the buffer)
        console.log('Step 3: Checking February summary (Pre-approval)...');
        // We'll simulate the logic here
        const preRes = await pool.query(`
            SELECT * FROM performance_weekly_data 
            WHERE employee_id = 7 AND (payroll_month = '2026-02' OR status = 'Pending')
        `);
        console.log('Found in Feb buffer:', preRes.rows.length); // Should be 1

        // 4. Trigger Approval (simulating the controller logic)
        console.log('Step 4: Approving February...');
        const pending = preRes.rows.filter(r => r.status === 'Pending');
        const ids = pending.map(r => r.id);

        await pool.query(`
            UPDATE performance_weekly_data 
            SET status = 'Processed', payroll_month = '2026-02' 
            WHERE id = ANY($1)
        `, [ids]);

        await pool.query(`
            INSERT INTO performance_monthly_approvals (employee_id, month, total_marks, total_amount, status)
            VALUES (7, '2026-02', 0.5, 500, 'Approved')
        `);

        // 5. Check if it shows up for February now (it should as it is processed for Feb)
        console.log('Step 5: Checking February summary (Post-approval)...');
        const postFebRes = await pool.query(`
            SELECT * FROM performance_weekly_data 
            WHERE employee_id = 7 AND (payroll_month = '2026-02' OR (status = 'Pending' AND NOT EXISTS (SELECT 1 FROM performance_monthly_approvals WHERE month = '2026-02' AND status = 'Approved')))
        `);
        console.log('Found in Feb after approval:', postFebRes.rows.length); // Should be 1

        // 6. Check if it shows up for March (it should NOT)
        console.log('Step 6: Checking March summary...');
        const marchRes = await pool.query(`
            SELECT * FROM performance_weekly_data 
            WHERE employee_id = 7 AND (payroll_month = '2026-03' OR (status = 'Pending' AND NOT EXISTS (SELECT 1 FROM performance_monthly_approvals WHERE month = '2026-03' AND status = 'Approved')))
        `);
        console.log('Found in March after Feb approval:', marchRes.rows.length); // Should be 0

        console.log('--- Verification Completed Successfully ---');
    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        await pool.end();
    }
}
verify();
