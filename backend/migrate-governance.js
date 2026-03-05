const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateGovernance = async () => {
    try {
        console.log('Starting Advanced Governance Migration...');

        const schemaPath = path.join(__dirname, 'database', 'governance_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Governance & Security Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateGovernance();
