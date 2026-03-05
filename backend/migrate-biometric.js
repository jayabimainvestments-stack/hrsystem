require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateBiometric = async () => {
    try {
        console.log('Starting Biometric Schema Migration...');

        const schemaPath = path.join(__dirname, 'database', 'biometric_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Biometric Integration Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateBiometric();
