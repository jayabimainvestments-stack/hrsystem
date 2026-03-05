const db = require('./config/db');

async function checkAdminPermissions() {
    try {
        console.log('--- CHECKING PERMISSIONS FOR ADMIN ---');

        const res = await db.query(`
            SELECT p.name 
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role = 'Admin'
        `);

        const perms = res.rows.map(r => r.name);
        console.log('Admin Permissions:', perms);

        const hasApprove = perms.includes('APPROVE_LEAVE');
        console.log(`Has APPROVE_LEAVE: ${hasApprove}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkAdminPermissions();
