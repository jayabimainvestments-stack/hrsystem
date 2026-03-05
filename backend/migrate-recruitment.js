const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrateRecruitment = async () => {
    try {
        console.log('Starting Recruitment Migration...');
        const schemaPath = path.join(__dirname, 'database', 'recruitment_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Recruitment Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Recruitment Migration Failed:', error);
        process.exit(1);
    }
};

migrateRecruitment();
