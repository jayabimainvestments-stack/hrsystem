const pool = require('./backend/config/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'backend', 'database', 'update_leaves_time.sql'), 'utf8');
        await pool.query(sql);
        console.log('Leaves time migration completed successfully.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        process.exit();
    }
}

runMigration();
