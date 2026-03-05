const db = require('./config/db');

const checkAccess = async () => {
    try {
        console.log('--- 👥 CURRENT USERS & ROLES ---');
        const users = await db.query('SELECT name, email, role FROM users ORDER BY role, name');
        console.table(users.rows);

        console.log('\n--- 🔑 PERMISSIONS PER ROLE ---');
        const roles = ['Admin', 'HR Manager', 'Employee'];

        for (const role of roles) {
            console.log(`\n[ ROLE: ${role} ]`);
            const perms = await db.query(`
                SELECT p.name 
                FROM role_permissions rp 
                JOIN permissions p ON rp.permission_id = p.id 
                WHERE rp.role = $1
                ORDER BY p.name
            `, [role]);

            if (perms.rows.length === 0) {
                console.log('  (No permissions assigned)');
            } else {
                perms.rows.forEach(p => console.log(`  - ${p.name}`));
            }
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkAccess();
