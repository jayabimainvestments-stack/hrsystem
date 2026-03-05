const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding column "reason" to employee_loans...');
        await db.query('ALTER TABLE employee_loans ADD COLUMN IF NOT EXISTS reason TEXT');
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
