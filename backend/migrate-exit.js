const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateExit = async () => {
    try {
        console.log('Starting Exit Management Migration...');
        const schemaPath = path.join(__dirname, 'database', 'exit_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Exit Management Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Exit Migration Failed:', error);
        process.exit(1);
    }
};

migrateExit();
