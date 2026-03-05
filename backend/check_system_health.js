const db = require('./config/db');

async function checkHealth() {
    console.log('--- SYSTEM HEALTH CHECK ---');
    let issues = 0;

    try {
        // 1. DB Connection
        await db.query('SELECT NOW()');
        console.log('✅ Database Connection: OK');

        // 2. Critical Tables Presence (Spot Check)
        const tables = ['users', 'employees', 'payroll', 'attendance', 'leaves', 'financial_requests', 'salary_components', 'attendance_policies'];
        for (const t of tables) {
            try {
                await db.query(`SELECT 1 FROM ${t} LIMIT 1`);
                console.log(`✅ Table '${t}': OK`);
            } catch (e) {
                console.error(`❌ Table '${t}': MISSING or ERROR (${e.message})`);
                issues++;
            }
        }

        // 3. Seed Data Verification
        // Attendance Policy
        const policy = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        if (policy.rows.length > 0) {
            console.log('✅ Attendance Policy: FOUND');
        } else {
            console.error('❌ Attendance Policy: MISSING (Payroll calculation will fail)');
            issues++;
        }

        // Salary Components
        const comps = await db.query('SELECT count(*) FROM salary_components');
        if (parseInt(comps.rows[0].count) > 0) {
            console.log(`✅ Salary Components: ${comps.rows[0].count} found`);
        } else {
            console.error('❌ Salary Components: EMPTY (Payroll will fail)');
            issues++;
        }

        // Admin User
        const admin = await db.query("SELECT * FROM users WHERE role = 'Admin' OR role = 'HR Manager' LIMIT 1");
        if (admin.rows.length > 0) {
            console.log('✅ Admin/HR User: FOUND');
        } else {
            console.error('❌ Admin/HR User: MISSING (Cannot login)');
            issues++;
        }

        console.log('---------------------------');
        if (issues === 0) {
            console.log('🎉 SYSTEM STATUS: HEALTHY');
            process.exit(0);
        } else {
            console.error(`⚠️ SYSTEM STATUS: UNSTABLE (${issues} issues found)`);
            process.exit(1);
        }

    } catch (error) {
        console.error('FATAL ERROR:', error);
        process.exit(1);
    }
}

checkHealth();
