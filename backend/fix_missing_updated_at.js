const db = require('./config/db');

/**
 * Safe Migration Script
 * Adds 'updated_at' column to tables if missing.
 * This operation is non-destructive and does not affect existing data.
 */
async function migrate() {
    try {
        console.log('--- Database Safety Check & Migration ---');

        // 1. Add to leaves table
        console.log('Checking "leaves" table...');
        await db.query(`
            ALTER TABLE leaves 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ "leaves" table updated (or already has the column).');

        // 2. Add to employee_salary_structure table
        console.log('Checking "employee_salary_structure" table...');
        await db.query(`
            ALTER TABLE employee_salary_structure 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ "employee_salary_structure" table updated (or already has the column).');

        console.log('\n✨ Migration successful: System integrity maintained.');
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
