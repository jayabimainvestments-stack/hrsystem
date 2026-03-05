const db = require('./config/db');

async function cleanupFeb2026() {
    const month = '2026-02';
    const datePattern = '2026-02-%';

    try {
        console.log(`Cleaning up all data for ${month}...`);

        // 1. Delete Payroll Details and Payroll
        await db.query(`
            DELETE FROM payroll_details 
            WHERE payroll_id IN (SELECT id FROM payroll WHERE month = $1)
        `, [month]);
        const pRes = await db.query('DELETE FROM payroll WHERE month = $1', [month]);
        console.log(`- Deleted ${pRes.rowCount} payroll records.`);

        // 2. Delete Attendance
        const aRes = await db.query("DELETE FROM attendance WHERE TO_CHAR(date, 'YYYY-MM') = $1", [month]);
        console.log(`- Deleted ${aRes.rowCount} attendance records.`);

        // 3. Delete Attendance Deductions
        const adRes = await db.query('DELETE FROM attendance_deductions WHERE month = $1', [month]);
        console.log(`- Deleted ${adRes.rowCount} attendance deduction entries.`);

        // 4. Delete Monthly Overrides
        const moRes = await db.query('DELETE FROM monthly_salary_overrides WHERE month = $1', [month]);
        console.log(`- Deleted ${moRes.rowCount} monthly salary overrides.`);

        // 5. Delete Performance Approvals
        const paRes = await db.query('DELETE FROM performance_monthly_approvals WHERE month = $1', [month]);
        console.log(`- Deleted ${paRes.rowCount} performance approval entries.`);

        // 6. Delete Performance Weekly Data
        const pwRes = await db.query("DELETE FROM performance_weekly_data WHERE TO_CHAR(week_starting, 'YYYY-MM') = $1", [month]);
        console.log(`- Deleted ${pwRes.rowCount} performance weekly data records.`);

        // 7. Reset Payroll Liabilities for the month
        const liabRes = await db.query('DELETE FROM payroll_liabilities WHERE month = $1', [month]);
        console.log(`- Deleted ${liabRes.rowCount} payroll liability records.`);

        console.log('\nCleanup complete and system ready for fresh 2026-02 data generation.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupFeb2026();
