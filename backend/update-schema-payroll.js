const db = require('./config/db');

const updateSchema = async () => {
    try {
        console.log('Updating payroll table schema...');

        // 1. Add new columns
        await db.query(`
            ALTER TABLE payroll 
            ADD COLUMN IF NOT EXISTS epf_employee DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS epf_employer DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS etf_employer DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS allowances DECIMAL(10, 2) DEFAULT 0;
        `);

        // 2. Modify net_salary to remove GENERATED ALWAYS
        // Dropping and re-adding as a standard column to allow saving the calculated value
        await db.query(`
            ALTER TABLE payroll DROP COLUMN IF EXISTS net_salary;
            ALTER TABLE payroll ADD COLUMN net_salary DECIMAL(10, 2);
        `);

        console.log('Payroll schema updated successfully.');
        process.exit();
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
};

updateSchema();
