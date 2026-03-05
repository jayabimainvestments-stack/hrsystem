const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Adding statutory_status to payroll table...');
        await db.query(`
            ALTER TABLE payroll 
            ADD COLUMN IF NOT EXISTS statutory_status VARCHAR(20) DEFAULT 'Pending'
        `);
        console.log('✅ Column added successfully');
        process.exit();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
