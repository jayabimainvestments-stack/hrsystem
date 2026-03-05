const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding overtime_hours to attendance table...');
        await db.query(`
            ALTER TABLE attendance 
            ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5, 2) DEFAULT 0;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
