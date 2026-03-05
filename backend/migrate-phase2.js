const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migratePhase2 = async () => {
    try {
        console.log('Starting Phase 2 Migration (Core HR)...');

        const schemaPath = path.join(__dirname, 'database', 'phase2_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await db.query(schemaSql);
        console.log('Phase 2 Schema applied successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Phase 2 Failed:', error);
        process.exit(1);
    }
};

migratePhase2();
