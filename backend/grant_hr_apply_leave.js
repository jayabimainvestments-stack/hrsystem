const db = require('./config/db');

async function grantPermission() {
    try {
        console.log('--- GRANTING "APPLY_LEAVE" TO HR MANAGER ---');

        // 1. Get permission ID
        const permRes = await db.query("SELECT id FROM permissions WHERE name = 'APPLY_LEAVE'");
        if (permRes.rows.length === 0) {
            console.error('Permission APPLY_LEAVE not found in DB');
            process.exit(1);
        }
        const permId = permRes.rows[0].id;

        // 2. Insert into role_permissions
        await db.query(`
            INSERT INTO role_permissions (role, permission_id)
            VALUES ('HR Manager', $1)
            ON CONFLICT (role, permission_id) DO NOTHING
        `, [permId]);

        console.log('✅ Granted APPLY_LEAVE to HR Manager');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

grantPermission();
