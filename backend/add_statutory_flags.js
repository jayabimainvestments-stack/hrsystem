require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

const addStatutoryFlags = async () => {
    try {
        console.log('Starting Statutory Flags Migration...');

        // Add epf_eligible and etf_eligible to salary_components
        await db.query(`
            ALTER TABLE salary_components 
            ADD COLUMN IF NOT EXISTS epf_eligible BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS etf_eligible BOOLEAN DEFAULT FALSE;
        `);

        // Update existing components based on name heuristics (basic salary is usually eligible)
        await db.query(`
            UPDATE salary_components 
            SET epf_eligible = TRUE, etf_eligible = TRUE 
            WHERE name ILIKE '%basic%' OR name ILIKE '%salary%';
        `);

        console.log('Statutory Flags Migration Completed Successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

addStatutoryFlags();
