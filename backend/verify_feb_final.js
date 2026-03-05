const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        console.log('Verifying February 2026 Integration...');

        // 1. Check overrides
        const overrides = await db.query(`
            SELECT mso.*, u.name as employee_name, sc.name as component_name 
            FROM monthly_salary_overrides mso
            JOIN employees e ON mso.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON mso.component_id = sc.id
            WHERE mso.month = '2026-02'
            ORDER BY u.name, sc.name
        `);

        console.log('\n--- Monthly Overrides (Approved) ---');
        overrides.rows.forEach(r => {
            console.log(`${r.employee_name}: ${r.component_name} = ${r.amount} (${r.status}) - ${r.reason}`);
        });

        // 2. Mock Payroll Preview logic to see if it picks up EVERYTHING
        // (Just a simple query matching the controller logic)
        const employees = await db.query("SELECT id FROM employees WHERE employment_status = 'Active'");
        console.log('\n--- Net Salary Preview (Internal Logic Check) ---');

        for (const emp of employees.rows) {
            const structure = await db.query(`
                SELECT sc.name, mso.amount as override_amount, mso.status
                FROM monthly_salary_overrides mso
                JOIN salary_components sc ON mso.component_id = sc.id
                WHERE mso.employee_id = $1 AND mso.month = '2026-02' AND mso.status = 'Approved'
            `, [emp.id]);

            console.log(`Employee ID ${emp.id} has ${structure.rows.length} components in overlaps.`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
