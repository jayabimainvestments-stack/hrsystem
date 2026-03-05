
const db = require('./backend/config/db');

async function resetSystemForProduction() {
    console.log('--- SYSTEM RESET STARTED ---');
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Tables to TRUNCATE (Transactions & Logs)
        const tablesToClear = [
            'attendance',
            'leaves',
            'leave_balances',
            'payroll_details',
            'payroll_liabilities',
            'payroll',
            'performance_weekly_data',
            'performance_monthly_approvals',
            'performance_appraisals',
            'performance_metric_ranges',
            'employee_performance_targets',
            'performance_appraisals',
            'financial_requests',
            'employee_loans',
            'resignations',
            'disciplinary_records',
            'documents',
            'audit_logs',
            'pending_changes',
            'job_applications',
            'candidates',
            'jobs',
            'training_certifications',
            'onboarding_tasks',
            'employment_history',
            'employee_history',
            'employee_salary_structure' // Based on previous user preference to restart salary info
        ];

        console.log('Clearing transactional data...');
        for (const table of tablesToClear) {
            try {
                await client.query(`TRUNCATE TABLE ${table} CASCADE`);
                console.log(`- Cleared: ${table}`);
            } catch (e) {
                console.warn(`- Skip (not found or already clear): ${table}`);
            }
        }

        await client.query('COMMIT');
        console.log('\n--- SUCCESS: SYSTEM RESET COMPLETE ---');
        console.log('Maintained: Employees, Users, Roles, Departments, Designations, Salary Component Definitions.');
        console.log('Now you can start entering real attendance, leaves, and production payroll data.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('CRITICAL ERROR DURING RESET:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

resetSystemForProduction();
