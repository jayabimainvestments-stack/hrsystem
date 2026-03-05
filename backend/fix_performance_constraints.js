const db = require('./config/db');

async function fixConstraints() {
    try {
        console.log('Starting constraint fix...');

        // 1. Identify and remove duplicates in performance_weekly_data
        // We keep the latest entry for each (employee_id, metric_id, week_starting)
        console.log('Cleaning up duplicate weekly data entries...');
        await db.query(`
            DELETE FROM performance_weekly_data a
            USING performance_weekly_data b
            WHERE a.id < b.id
            AND a.employee_id = b.employee_id
            AND a.metric_id = b.metric_id
            AND a.week_starting = b.week_starting
        `);

        // 2. Add the UNIQUE constraint
        console.log('Adding UNIQUE constraint to performance_weekly_data...');
        await db.query(`
            ALTER TABLE performance_weekly_data
            ADD CONSTRAINT performance_weekly_data_emp_metric_week_unique 
            UNIQUE (employee_id, metric_id, week_starting)
        `);

        // 3. Ensure recorded_by column is nullable or has default (it already is nullable according to schema check)

        console.log('--- Constraint Fix Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fixConstraints();
