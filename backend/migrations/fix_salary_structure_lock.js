const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding lock columns to employee_salary_structure...');
        await db.query(`
            ALTER TABLE employee_salary_structure 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS lock_reason TEXT;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
