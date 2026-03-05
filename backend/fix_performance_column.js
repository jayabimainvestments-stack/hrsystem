const db = require('./config/db');

async function fixColumn() {
    try {
        console.log('Ensuring updated_at column exists...');
        await db.query(`
            ALTER TABLE performance_weekly_data 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ Column ensured!');
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fixColumn();
