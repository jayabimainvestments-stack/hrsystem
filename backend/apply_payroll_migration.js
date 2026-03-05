const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database', 'add_payroll_constraint.sql'), 'utf8');
        console.log('--- Applying Migration: Unique Constraint for Payroll ---');
        await db.query(sql);
        console.log('Migration applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying migration:', err.message);
        process.exit(1);
    }
}

applyMigration();
