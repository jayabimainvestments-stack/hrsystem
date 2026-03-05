const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Adding welfare_status to payroll table...');
        await db.query(`
            ALTER TABLE payroll 
            ADD COLUMN IF NOT EXISTS welfare_status VARCHAR(20) DEFAULT 'Pending'
        `);

        // Initialize welfare_status with statutory_status for existing records to maintain consistency
        await db.query(`
            UPDATE payroll 
            SET welfare_status = statutory_status 
            WHERE welfare_status IS NULL OR welfare_status = 'Pending'
        `);

        console.log('✅ Column added and initialized successfully');
        process.exit();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
