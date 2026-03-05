const db = require('./config/db');

async function checkEmployeePermissions() {
    try {
        console.log('--- CHECKING PERMISSIONS FOR EMPLOYEE ---');

        const res = await db.query(`
            SELECT p.name 
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role = 'Employee'
        `);

        console.log('Employee Permissions:', res.rows.map(r => r.name));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkEmployeePermissions();
