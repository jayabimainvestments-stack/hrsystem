const db = require('./config/db');
async function run() {
    try {
        console.log('Running migration to change default status of monthly_salary_overrides...');
        await db.query(`
            ALTER TABLE monthly_salary_overrides 
            ALTER COLUMN status SET DEFAULT 'Draft';
        `);
        console.log('Update successful: Default status is now Draft');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}
run();
