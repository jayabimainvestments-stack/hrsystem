const db = require('./config/db');

async function fixPermissions() {
    try {
        console.log('--- Fixing Attendance Permissions ---');
        await db.query('BEGIN');

        // 1. Add missing permissions
        const permissions = [
            { name: 'VIEW_ATTENDANCE', desc: 'View attendance logs and monthly reports' },
            { name: 'MANAGE_ATTENDANCE', desc: 'Add, update, and sync attendance records' },
            { name: 'VIEW_BIOMETRIC', desc: 'View biometric devices and hardware logs' },
            { name: 'MANAGE_BIOMETRIC', desc: 'Register and manage biometric terminal hardware' }
        ];

        for (const p of permissions) {
            await db.query(`
                INSERT INTO permissions (name, description)
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING
            `, [p.name, p.desc]);
        }

        // 2. Assign permissions to Admin and HR Manager
        const roles = ['Admin', 'HR Manager'];
        const permissionNames = ['VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'VIEW_BIOMETRIC', 'MANAGE_BIOMETRIC'];

        for (const role of roles) {
            for (const pName of permissionNames) {
                await db.query(`
                    INSERT INTO role_permissions (role, permission_id)
                    SELECT $1, id FROM permissions WHERE name = $2
                    ON CONFLICT (role, permission_id) DO NOTHING
                `, [role, pName]);
            }
        }

        await db.query('COMMIT');
        console.log('✅ Permissions fixed: Attendance & Biometric permissions added and assigned to Admin/HR.');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('❌ Failed to fix permissions:', err);
    } finally {
        process.exit();
    }
}

fixPermissions();
