const db = require('./config/db');

async function wipeData() {
    try {
        console.log('--- STARTING SYSTEM DATA WIPE ---');
        console.log('This will preserve only admin@example.com for system access.');

        // Order matters for FK constraints if not using CASCADE, but TRUNCATE CASCADE/CASCADE DELETE handles it.
        const tablesToTruncate = [
            'payroll_details',
            'payroll_liabilities',
            'payroll',
            'employee_salary_structure',
            'salary_structures',
            'employee_bank_details',
            'employee_families',
            'employment_history',
            'employee_history',
            'onboarding_tasks',
            'leaves',
            'leave_balances',
            'documents',
            'attendance',
            'jobs',
            'job_applications',
            'candidates',
            'resignations',
            'performance_appraisals',
            'disciplinary_records',
            'training_certifications',
            'pending_changes',
            'audit_logs',
            'attendance_devices'
        ];

        await db.query('BEGIN');

        for (const table of tablesToTruncate) {
            console.log(`Truncating table: ${table}`);
            await db.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        }

        console.log('Removing all users except admin@example.com...');
        // This will cascade to 'employees' table as well due to ON DELETE CASCADE
        const deleteUsersRes = await db.query(`
            DELETE FROM users 
            WHERE email != 'admin@example.com'
        `);
        console.log(`Removed ${deleteUsersRes.rowCount} user accounts.`);

        // Final check on employees
        const empCount = await db.query('SELECT COUNT(*) FROM employees');
        console.log(`Remaining employee profiles: ${empCount.rows[0].count}`);

        await db.query('COMMIT');

        console.log('--- DATA WIPE COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Data wipe failed:', error);
        process.exit(1);
    }
}

wipeData();
