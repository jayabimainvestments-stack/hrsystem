const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('--- Updating Leaves Table Schema ---');
        await db.query(`
            ALTER TABLE leaves 
            ADD COLUMN IF NOT EXISTS paid_days DECIMAL(4, 1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS unpaid_days DECIMAL(4, 1) DEFAULT 0
        `);
        console.log('✅ Columns added successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema update failed:', error);
        process.exit(1);
    }
}

updateSchema();
