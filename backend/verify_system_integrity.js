const db = require('./config/db');

async function verifySystem() {
    try {
        console.log('--- SYSTEM INTEGRITY CHECK ---\n');

        // 1. Check Critical Permissions
        console.log('1. Checking Critical Role Permissions...');
        const rolesToCheck = ['Admin', 'HR Manager', 'Employee'];
        const requiredPermissions = {
            'Admin': ['MANAGE_PAYROLL', 'APPROVE_LEAVE', 'MANAGE_EMPLOYEES', 'MANAGE_ATTENDANCE'],
            'HR Manager': ['APPROVE_LEAVE', 'MANAGE_ATTENDANCE', 'VIEW_EMPLOYEES', 'APPLY_LEAVE'],
            'Employee': ['VIEW_OWN_PAYROLL', 'APPLY_LEAVE']
        };

        for (const role of rolesToCheck) {
            const res = await db.query(`
                SELECT p.name 
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role = $1
            `, [role]);

            const existingPerms = res.rows.map(r => r.name);
            const missing = requiredPermissions[role].filter(p => !existingPerms.includes(p));

            if (missing.length > 0) {
                console.error(`[FAIL] Role '${role}' is missing permissions: ${missing.join(', ')}`);
            } else {
                console.log(`[PASS] Role '${role}' has all core permissions.`);
            }
        }

        // 2. Check Leave Balance Consistency
        console.log('\n2. Checking Leave Balance Consistency...');

        const balanceCheck = await db.query(`
             WITH CalculatedUsage AS (
                SELECT 
                    user_id, 
                    leave_type_id, 
                    COALESCE(SUM(paid_days), 0) as calc_used
                FROM leaves 
                WHERE status = 'Approved' 
                AND start_date >= '2026-01-01' AND start_date <= '2026-12-31'
                GROUP BY user_id, leave_type_id
            )
            SELECT 
                u.name as employee_name, 
                lt.name as leave_type, 
                lb.used_days as db_used,
                COALESCE(cu.calc_used, 0) as real_used
            FROM leave_balances lb
            JOIN users u ON lb.user_id = u.id
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            LEFT JOIN CalculatedUsage cu ON lb.user_id = cu.user_id AND lb.leave_type_id = cu.leave_type_id
            WHERE lb.year = 2026 AND lb.used_days != COALESCE(cu.calc_used, 0)
        `);

        if (balanceCheck.rows.length > 0) {
            console.warn(`[WARN] Found ${balanceCheck.rows.length} leave balance mismatches (Balance Table vs Actual Approved Leaves):`);
            balanceCheck.rows.forEach(r => {
                console.log(`  - ${r.first_name} (${r.leave_type}): DB says ${r.db_used}, Calc says ${r.real_used}`);
            });
        } else {
            console.log(`[PASS] All leave balances match approved leave records.`);
        }

        // 3. User-Employee Linkage
        console.log('\n3. Checking User-Employee Linkage...');
        const orphanUsers = await db.query(`
            SELECT id, name, role FROM users 
            WHERE role != 'Admin' 
            AND id NOT IN (SELECT user_id FROM employees WHERE user_id IS NOT NULL)
        `);

        if (orphanUsers.rows.length > 0) {
            console.warn(`[WARN] Found ${orphanUsers.rows.length} Users without Employee profiles (excluding Admin):`);
            orphanUsers.rows.forEach(u => console.log(`  - ${u.name} (${u.role})`));
        } else {
            console.log(`[PASS] All non-admin users lead to employee profiles.`);
        }

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('Verification failed:', err);
    }

    // Attempt to close if pool is exposed, else exit
    if (db.pool) {
        await db.pool.end();
    } else {
        process.exit(0);
    }
}

verifySystem();
