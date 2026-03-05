const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const tables = ['performance_weekly_data', 'performance_monthly_approvals', 'performance_metrics', 'employee_performance_targets', 'performance_settings', 'monthly_salary_overrides'];

        for (const table of tables) {
            console.log(`--- Table: ${table} ---`);
            const cols = await db.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log('Columns:', cols.rows);

            const constraints = await db.query(`
                SELECT conname, pg_get_constraintdef(c.oid) as def
                FROM pg_constraint c
                JOIN pg_class r ON c.conrelid = r.oid
                WHERE r.relname = $1
            `, [table]);
            console.log('Constraints:', constraints.rows);
            console.log('\n');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
