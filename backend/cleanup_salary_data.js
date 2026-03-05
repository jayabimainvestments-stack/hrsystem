const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function cleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Clearing pending_changes (Salary & Attendance related)...');
        // Clear all salary, financial and attendance related pending approvals
        await client.query(`
            DELETE FROM pending_changes 
            WHERE entity IN ('employee_salary_structure', 'salary_structures', 'financial_requests', 'attendance')
        `);

        console.log('2. Clearing financial_requests (Advances, Fuel, etc. marked for approval)...');
        await client.query('DELETE FROM financial_requests');

        console.log('3. Clearing monthly_salary_overrides (Approved/Saved monthly values)...');
        await client.query('DELETE FROM monthly_salary_overrides');

        console.log('4. Clearing payroll records and details (Finalized salary logs)...');
        // Delete details first due to foreign key constraints if any
        await client.query('DELETE FROM payroll_details');
        await client.query('DELETE FROM payroll');

        console.log('5. Clearing attendance_deductions...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'attendance_deductions'
            )
        `);
        if (tableCheck.rows[0].exists) {
            await client.query('DELETE FROM attendance_deductions');
        }

        console.log('6. Unlocking salary structure components...');
        // Some components like Fuel are locked when a request is approved.
        await client.query(`
            UPDATE employee_salary_structure 
            SET is_locked = false, lock_reason = NULL 
            WHERE is_locked = true
        `);

        await client.query('COMMIT');
        console.log('SUCCESS: All marked and saved salary data cleared.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('ERROR during cleanup:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
