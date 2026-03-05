const db = require('./config/db');

const deleteUsers = async () => {
    const userIds = [6, 7, 10, 11, 12];
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const userId of userIds) {
            console.log(`\nProcessing User ID: ${userId}...`);

            // 1. Delete Payroll Details
            const payrollRes = await client.query('SELECT id FROM payroll WHERE user_id = $1', [userId]);
            const payrollIds = payrollRes.rows.map(r => r.id);

            if (payrollIds.length > 0) {
                console.log(`- Deleting payroll details for ${payrollIds.length} records...`);
                await client.query('DELETE FROM payroll_details WHERE payroll_id = ANY($1)', [payrollIds]);
            }

            // 2. Delete Payroll
            console.log('- Deleting payroll records...');
            await client.query('DELETE FROM payroll WHERE user_id = $1', [userId]);

            // 3. Delete Salary Structure
            console.log('- Deleting salary structure...');
            // Need to find employee ID first to be safe, or subquery
            await client.query('DELETE FROM employee_salary_structure WHERE employee_id IN (SELECT id FROM employees WHERE user_id = $1)', [userId]);

            // 4. Delete Employee Record
            console.log('- Deleting employee record...');
            await client.query('DELETE FROM employees WHERE user_id = $1', [userId]);

            // 5. Delete Audit Logs
            console.log('- Deleting audit logs...');
            await client.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);

            // 6. Delete User Account
            console.log('- Deleting user account...');
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
        }

        await client.query('COMMIT');
        console.log('\n✅ All specified users and data deleted successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Deletion failed:', error);
    } finally {
        client.release();
        process.exit();
    }
};

deleteUsers();
