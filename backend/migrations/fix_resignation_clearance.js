const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding clearance columns to resignations table...');
        await db.query(`
            ALTER TABLE resignations 
            ADD COLUMN IF NOT EXISTS clearance_it BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS clearance_finance BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS clearance_hr BOOLEAN DEFAULT FALSE;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
