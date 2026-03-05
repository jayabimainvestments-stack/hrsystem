const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateMasterEmployee = async () => {
    try {
        console.log('Starting Master Employee Migration...');

        const schemaPath = path.join(__dirname, 'database', 'master_employee_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Master Employee Schema & Expanded Permissions applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateMasterEmployee();
