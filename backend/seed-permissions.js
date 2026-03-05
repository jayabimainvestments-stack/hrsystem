const db = require('./config/db');

const seedPermissions = async () => {
    try {
        console.log('Seeding Permissions...');

        // 1. Create Permissions
        const permissions = [
            'MANAGE_PAYROLL',
            'VIEW_OWN_PAYROLL',
            'VIEW_ALL_PAYROLL'
        ];

        for (const perm of permissions) {
            await db.query(`
                INSERT INTO permissions (name, description) 
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING
            `, [perm, 'Payroll Permission']);
        }

        // 2. Get Permission IDs
        const permRes = await db.query('SELECT id, name FROM permissions');
        const permMap = {};
        permRes.rows.forEach(p => permMap[p.name] = p.id);

        // 3. Assign to Roles
        const roles = {
            'Admin': ['MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL', 'VIEW_OWN_PAYROLL'],
            'HR Manager': ['MANAGE_PAYROLL', 'VIEW_ALL_PAYROLL', 'VIEW_OWN_PAYROLL'],
            'Employee': ['VIEW_OWN_PAYROLL']
        };

        for (const [role, perms] of Object.entries(roles)) {
            for (const permName of perms) {
                if (permMap[permName]) {
                    await db.query(`
                        INSERT INTO role_permissions (role, permission_id)
                        VALUES ($1, $2)
                        ON CONFLICT DO NOTHING
                    `, [role, permMap[permName]]);
                }
            }
        }

        console.log('Permissions seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding permissions:', error);
        process.exit(1);
    }
};

seedPermissions();
