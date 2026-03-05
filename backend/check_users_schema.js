const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function checkUsersSchema() {
    try {
        console.log("\n=== CHECKING USERS TABLE SCHEMA ===\n");

        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        console.log("📋 Users table columns:\n");
        console.table(result.rows);

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkUsersSchema();
