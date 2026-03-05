const db = require('./config/db');

const checkUserAccess = async () => {
    const targetName = "DISSANAYAKE MUDIYANSELAGE KRISHANTHA MAITHREE DISSANAYAKE";

    try {
        console.log(`--- 🔍 CHECKING ACCESS FOR: ${targetName} ---`);

        // 1. Get User & Role
        const userRes = await db.query('SELECT id, name, email, role FROM users WHERE name ILIKE $1', [targetName]);

        if (userRes.rows.length === 0) {
            console.log('❌ User not found!');
            // Try fuzzy search or list similar
            const allUsers = await db.query('SELECT name FROM users');
            console.log('Did you mean one of these?');
            console.table(allUsers.rows);
            process.exit(0);
        }

        const user = userRes.rows[0];
        console.log(`✅ User Found:`);
        console.table([user]);

        // 2. Get Permissions for this Role
        console.log(`\n--- 🔑 PERMISSIONS FOR ROLE: ${user.role} ---`);
        const perms = await db.query(`
            SELECT p.name, p.description 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role = $1
            ORDER BY p.name
        `, [user.role]);

        if (perms.rows.length === 0) {
            console.log('⚠️ No permissions found for this role.');
        } else {
            console.table(perms.rows);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUserAccess();
