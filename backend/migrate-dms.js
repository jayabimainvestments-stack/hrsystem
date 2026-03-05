const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateDMS = async () => {
    try {
        console.log('Starting DMS Migration...');
        const schemaPath = path.join(__dirname, 'database', 'dms_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('DMS Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateDMS();
