const db = require('./config/db');

const seedPermissions = async () => {
    try {
        console.log('Seeding Permissions...');

        // 1. Define Permissions
        const permissions = [
            'MANAGE_EMPLOYEES', 'VIEW_EMPLOYEES',
            'MANAGE_LEAVES', 'APPROVE_LEAVES', 'VIEW_LEAVES',
            'MANAGE_PAYROLL', 'VIEW_OWN_PAYROLL', 'VIEW_ALL_PAYROLL',
            'MANAGE_DOCUMENTS', 'VIEW_DOCUMENTS',
            'MANAGE_RECRUITMENT', 'VIEW_JOBS',
            'MANAGE_ONBOARDING', 'VIEW_ONBOARDING',
            'MANAGE_RESIGNATIONS', 'SUBMIT_RESIGNATION',
            'VIEW_AUDIT_LOGS', 'MANAGE_ROLES',
            'MANAGE_ATTENDANCE', 'VIEW_ATTENDANCE'
        ];

        // Insert Permissions
        for (const perm of permissions) {
            await db.query(
                `INSERT INTO permissions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [perm]
            );
        }
        console.log('Permissions inserted.');

        // 2. Fetch Permission IDs
        const permRes = await db.query('SELECT * FROM permissions');
        const permMap = {};
        permRes.rows.forEach(p => permMap[p.name] = p.id);

        // 3. Define Role Mappings
        const roleMappings = {
            'Admin': permissions, // Admin gets everything
            'HR Manager': [
                'MANAGE_EMPLOYEES', 'VIEW_EMPLOYEES',
                'MANAGE_LEAVES', 'APPROVE_LEAVES', 'VIEW_LEAVES',
                'MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL',
                'MANAGE_DOCUMENTS', 'VIEW_DOCUMENTS',
                'MANAGE_RECRUITMENT',
                'MANAGE_ONBOARDING',
                'MANAGE_RESIGNATIONS',
                'MANAGE_ATTENDANCE', 'VIEW_ATTENDANCE'
            ],
            'Employee': [
                'VIEW_OWN_PAYROLL',
                'VIEW_DOCUMENTS', // Own documents usually handled by logic, but generic view maybe
                'SUBMIT_RESIGNATION',
                'VIEW_JOBS'
            ]
        };

        // 4. Insert Role Permissions
        for (const [role, perms] of Object.entries(roleMappings)) {
            for (const permName of perms) {
                const permId = permMap[permName];
                if (permId) {
                    await db.query(
                        `INSERT INTO role_permissions (role, permission_id) VALUES ($1, $2) 
                         ON CONFLICT (role, permission_id) DO NOTHING`,
                        [role, permId]
                    );
                }
            }
        }

        console.log('Role Permissions seeded.');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedPermissions();
