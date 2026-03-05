const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateEnterprise = async () => {
    try {
        console.log('Starting Enterprise Migration...');

        const schemaPath = path.join(__dirname, 'database', 'enterprise_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Enterprise Schema (Audit & Permissions) applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateEnterprise();
