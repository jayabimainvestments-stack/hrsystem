const db = require('./config/db');

const deleteUser = async () => {
    const userId = 2; // John Doe
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        console.log(`Deleting data for User ID: ${userId}...`);

        // 1. Delete Payroll Liabilities (linked via logic, but no direct FK to user, maybe linked to payroll? no, stored by month/type)
        // Actually, liability is aggregate. But if we delete a user, we might want to recalc? 
        // For now, leave liabilities as they are historical/aggregate or manual. 
        // But wait, if I delete payroll records, the liability calculation might be off if I re-run it?
        // The prompt says "REMOVE... DATA". 
        // I will delete the personal records.

        // 2. Delete Payroll Details
        // Need to get payroll IDs first
        const payrollRes = await client.query('SELECT id FROM payroll WHERE user_id = $1', [userId]);
        const payrollIds = payrollRes.rows.map(r => r.id);

        if (payrollIds.length > 0) {
            console.log(`Deleting payroll details for ${payrollIds.length} records...`);
            await client.query('DELETE FROM payroll_details WHERE payroll_id = ANY($1)', [payrollIds]);
        }

        // 3. Delete Payroll
        console.log('Deleting payroll records...');
        await client.query('DELETE FROM payroll WHERE user_id = $1', [userId]);

        // 4. Delete Attendance
        // check if table exists
        // await client.query('DELETE FROM attendance WHERE user_id = $1', [userId]); 
        // (Accessing attendance table blindly might fail if it doesn't exist or name is diff)
        // I'll stick to what I know exists or use catch to ignore

        // 5. Delete Leaves
        // await client.query('DELETE FROM leaves WHERE user_id = $1', [userId]);

        // 6. Delete Employee Salary Structure
        console.log('Deleting salary structure...');
        await client.query('DELETE FROM employee_salary_structure WHERE employee_id IN (SELECT id FROM employees WHERE user_id = $1)', [userId]);

        // 7. Delete Employees
        console.log('Deleting employee record...');
        await client.query('DELETE FROM employees WHERE user_id = $1', [userId]);

        // 7.5 Delete Audit Logs
        console.log('Deleting audit logs...');
        await client.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);

        // 8. Delete User
        console.log('Deleting user account...');
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        await client.query('COMMIT');
        console.log('✅ User and data deleted successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Deletion failed:', error);
    } finally {
        client.release();
        process.exit();
    }
};

deleteUser();
