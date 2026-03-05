const db = require('./config/db');

async function grantPermission() {
    try {
        console.log('--- GRANTING VIEW_EMPLOYEES TO HR MANAGER ---');

        // 1. Get Permission ID
        const permRes = await db.query("SELECT id FROM permissions WHERE name = 'VIEW_EMPLOYEES'");
        if (permRes.rows.length === 0) {
            console.error('Permission VIEW_EMPLOYEES not found in database manually.');
            // Optional: Insert if missing, but usually permissions are seeded
            await db.query("INSERT INTO permissions (name, description) VALUES ('VIEW_EMPLOYEES', 'View employee profiles')");
            console.log('Created permission VIEW_EMPLOYEES');
        }

        const permIdRes = await db.query("SELECT id FROM permissions WHERE name = 'VIEW_EMPLOYEES'");
        const permId = permIdRes.rows[0].id;

        // 2. Check if already granted
        const checkRes = await db.query(
            "SELECT * FROM role_permissions WHERE role = 'HR Manager' AND permission_id = $1",
            [permId]
        );

        if (checkRes.rows.length > 0) {
            console.log('Permission already granted.');
        } else {
            // 3. Grant
            await db.query(
                "INSERT INTO role_permissions (role, permission_id) VALUES ('HR Manager', $1)",
                [permId]
            );
            console.log('Permission granted successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

grantPermission();
