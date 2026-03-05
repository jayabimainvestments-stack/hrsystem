const db = require('./config/db');

async function migrateLeavesTable() {
    try {
        console.log('Adding missing columns to leaves table...');

        // Add paid_days
        await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS paid_days NUMERIC DEFAULT 0');
        // Add unpaid_days
        await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS unpaid_days NUMERIC DEFAULT 0');
        // Add short_leave_hours
        await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS short_leave_hours NUMERIC DEFAULT 0');
        // Add start_time
        await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS start_time TIME');
        // Add end_time
        await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS end_time TIME');

        console.log('✅ Migration successful: Missing columns added to leaves table.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrateLeavesTable();
