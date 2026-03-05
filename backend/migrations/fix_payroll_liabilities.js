const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding missing columns to payroll_liabilities...');
        await db.query(`
            ALTER TABLE payroll_liabilities 
            ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(255),
            ADD COLUMN IF NOT EXISTS payment_date DATE,
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
            ADD COLUMN IF NOT EXISTS notes TEXT;
        `);
        console.log('Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
