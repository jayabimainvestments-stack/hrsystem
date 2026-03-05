const db = require('../config/db');

const clearPayroll = async () => {
    try {
        console.log('Clearing payroll data...');
        // Cascade should handle details if FK is set up correctly, but explicit is safer or TRUNCATE ... CASCADE
        await db.query('TRUNCATE TABLE payroll, payroll_details, payroll_liabilities RESTART IDENTITY CASCADE');
        console.log('Payroll data cleared successfully.');
        process.exit();
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearPayroll();
