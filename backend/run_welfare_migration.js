const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', 'welfare_ledger.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running Welfare Ledger Migration...');
        await db.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
