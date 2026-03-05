const db = require('./config/db');

async function fixSchema() {
    try {
        console.log('Adding fuel_rate_per_liter to attendance_policies...');
        await db.query(`
            ALTER TABLE attendance_policies 
            ADD COLUMN IF NOT EXISTS fuel_rate_per_liter NUMERIC DEFAULT 0
        `);
        console.log('Success: fuel_rate_per_liter column added.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing schema:', error);
        process.exit(1);
    }
}

fixSchema();
