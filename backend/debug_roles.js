const db = require('./config/db');

async function debugRoles() {
    try {
        console.log('--- 1. ROLES TABLE ---');
        const roles = await db.query('SELECT * FROM roles');
        console.table(roles.rows);

        console.log('\n--- 2. ROLE PERMISSIONS COUNT ---');
        const rpCount = await db.query('SELECT role, COUNT(*) as count FROM role_permissions GROUP BY role');
        console.table(rpCount.rows);

        console.log('\n--- 3. TEST QUERY (security.controller.js) ---');
        const result = await db.query(`
            SELECT 
                r.name as role, 
                r.description, 
                r.is_system,
                p.id as permission_id, 
                p.name as permission_name
            FROM roles r
            LEFT JOIN role_permissions rp ON r.name = rp.role
            LEFT JOIN permissions p ON rp.permission_id = p.id
            ORDER BY r.name, p.name
        `);
        console.log(`Query returned ${result.rows.length} rows.`);
        if (result.rows.length > 0) {
            console.log('First 5 rows:');
            console.table(result.rows.slice(0, 5));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugRoles();
