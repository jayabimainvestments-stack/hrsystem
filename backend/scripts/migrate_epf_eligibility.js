const db = require('../config/db');

const migrate = async () => {
    try {
        await db.query(`
            ALTER TABLE employees 
            ADD COLUMN IF NOT EXISTS is_epf_eligible BOOLEAN DEFAULT TRUE
        `);
        console.log('Successfully added is_epf_eligible column to employees table.');
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
