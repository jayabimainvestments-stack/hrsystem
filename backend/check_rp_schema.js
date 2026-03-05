const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkRolePermissionsSchema() {
    try {
        console.log("\n=== CHECKING ROLE_PERMISSIONS TABLE SCHEMA ===\n");
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'role_permissions'
            ORDER BY ordinal_position
        `);
        console.table(result.rows);
    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkRolePermissionsSchema();
