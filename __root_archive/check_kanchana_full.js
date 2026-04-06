const db = require('./backend/config/db');

async function check() {
    try {
        console.log('--- Kanchana Payroll & Audit Check ---');
        
        const empRes = await db.query(`
            SELECT e.id, e.user_id, u.name 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name LIKE '%Kanchana%' OR e.id = 29
        `);
        const emp = empRes.rows[0];
        if (!emp) {
            console.log('Employee 29 not found');
            process.exit();
        }

        // 1. All Payroll for this user
        const payrollRes = await db.query(`
            SELECT * FROM payroll 
            WHERE user_id = $1 
            ORDER BY month DESC
        `, [emp.user_id]);
        console.log('\nAll Payroll Records:', JSON.stringify(payrollRes.rows, null, 2));

        // 2. Audit Logs - Finding what changed in attendance for March
        // Since 'created_at' failed, let's check all columns first
        const auditCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'");
        console.log('\nAudit Logs Columns:', JSON.stringify(auditCols.rows.map(c => c.column_name)));

        const auditRes = await db.query(`
            SELECT * FROM audit_logs 
            WHERE (entity_id = '29' OR new_values::text LIKE '%29%')
            ORDER BY 1 DESC LIMIT 20
        `);
        console.log('\nRecent Audit Logs:', JSON.stringify(auditRes.rows, null, 2));

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
