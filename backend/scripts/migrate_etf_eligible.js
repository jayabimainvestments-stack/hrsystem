const db = require('../config/db');

const migrate = async () => {
    try {
        console.log('Adding is_etf_eligible column to employees table...');
        await db.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_etf_eligible BOOLEAN DEFAULT TRUE');
        console.log('Migration completed successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
