const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding rejection_reason to financial_requests...');
        await db.query(`
            ALTER TABLE financial_requests 
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
