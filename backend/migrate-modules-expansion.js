const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateModules = async () => {
    try {
        console.log('Starting Module Expansion Migration...');

        const schemaPath = path.join(__dirname, 'database', 'performance_legal_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Performance, Legal, and Compliance Modules Applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateModules();
