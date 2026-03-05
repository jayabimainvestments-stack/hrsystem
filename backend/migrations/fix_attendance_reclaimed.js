const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding leave_reclaimed to attendance table...');
        await db.query(`
            ALTER TABLE attendance 
            ADD COLUMN IF NOT EXISTS leave_reclaimed BOOLEAN DEFAULT FALSE;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
