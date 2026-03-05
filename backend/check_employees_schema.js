const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

/**
 * Check employees table schema
 */

async function checkEmployeesSchema() {
    try {
        console.log("\n=== CHECKING EMPLOYEES TABLE SCHEMA ===\n");

        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees'
            ORDER BY ordinal_position
        `);

        console.log("📋 Employees table columns:\n");
        console.table(result.rows);

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkEmployeesSchema();
