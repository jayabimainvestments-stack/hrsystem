const db = require('./config/db');

async function checkIntegrity() {
    try {
        console.log('--- SYSTEM INTEGRITY DIAGNOSTIC ---');

        // 1. Check RBAC
        const roles = await db.query('SELECT count(*) FROM roles');
        const perms = await db.query('SELECT count(*) FROM permissions');
        const rolePerms = await db.query('SELECT count(*) FROM role_permissions');
        console.log(`RBAC: ${roles.rows[0].count} Roles, ${perms.rows[0].count} Permissions, ${rolePerms.rows[0].count} Mappings`);

        // 2. Check Users & Profile Picture
        const usersInfo = await db.query('SELECT id, name, role, profile_picture FROM users');
        console.log(`Users: Found ${usersInfo.rows.length} records.`);
        usersInfo.rows.forEach(u => {
            console.log(` - User [${u.id}]: ${u.name} (${u.role}) | Pic: ${u.profile_picture ? 'SET' : 'NOT SET'}`);
        });

        // 3. Check Attendance Policies (Fixed Deduction Check)
        const policies = await db.query('SELECT * FROM attendance_policies');
        console.log(`Attendance Policies: Found ${policies.rows.length} records.`);
        policies.rows.forEach(p => {
            console.log(` - Policy [${p.id}]: Absent Day Amount = ${p.absent_day_amount}`);
        });

        // 4. Check Employee Records
        const employees = await db.query('SELECT count(*) FROM employees');
        console.log(`Employees: ${employees.rows[0].count} records intact.`);

        console.log('--- DIAGNOSTIC COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC FAILED:', error);
        process.exit(1);
    }
}

checkIntegrity();
