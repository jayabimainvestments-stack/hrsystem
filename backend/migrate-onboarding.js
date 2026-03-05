const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateOnboarding = async () => {
    try {
        console.log('Starting Onboarding Migration...');
        const schemaPath = path.join(__dirname, 'database', 'onboarding_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Onboarding Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Onboarding Migration Failed:', error);
        process.exit(1);
    }
};

migrateOnboarding();
