const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPermissions() {
    try {
        const res = await pool.query(`
            SELECT rp.role, p.name as permission 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id
            WHERE p.name = 'APPROVE_LEAVE'
        `);
        console.log('--- ROLES WITH APPROVE_LEAVE PERMISSION ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPermissions();
