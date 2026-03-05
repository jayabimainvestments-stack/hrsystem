const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await db.query(schemaSql);
        console.log('Schema initialized successfully.');
        process.exit();
    } catch (error) {
        console.error('Error initializing schema:', error);
        process.exit(1);
    }
};

initDb();
