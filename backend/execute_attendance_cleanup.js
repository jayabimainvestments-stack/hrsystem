const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
    try {
        await pool.query('BEGIN');

        console.log('--- Cleaning Up Attendance Data ---');
        const attDel = await pool.query('DELETE FROM attendance');
        console.log(`Deleted ${attDel.rowCount} records from attendance.`);

        console.log('\n--- Cleaning Up Leave Data ---');
        const leavesDel = await pool.query('DELETE FROM leaves');
        console.log(`Deleted ${leavesDel.rowCount} records from leaves.`);

        console.log('\n--- Cleaning Up Leave Balances ---');
        const lbDel = await pool.query('DELETE FROM leave_balances');
        console.log(`Deleted ${lbDel.rowCount} records from leave_balances.`);

        console.log('\n--- Cleaning Up Attendance Deductions ---');
        const adDel = await pool.query('DELETE FROM attendance_deductions');
        console.log(`Deleted ${adDel.rowCount} records from attendance_deductions.`);

        console.log('\n--- Cleaning Up Audit Logs & Employee History ---');
        const auditDel = await pool.query('DELETE FROM audit_logs');
        const histDel = await pool.query('DELETE FROM employee_history');
        console.log(`Deleted ${auditDel.rowCount} records from audit_logs.`);
        console.log(`Deleted ${histDel.rowCount} records from employee_history.`);

        await pool.query('COMMIT');
        console.log('\nAttendance and Leave cleanup completed successfully.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Cleanup failed:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
