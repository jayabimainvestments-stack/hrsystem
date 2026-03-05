const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateLeaveExpansion = async () => {
    try {
        console.log('Starting Leave Expansion Migration...');

        const schemaPath = path.join(__dirname, 'database', 'leave_expansion.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Leave Expansion Applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateLeaveExpansion();
