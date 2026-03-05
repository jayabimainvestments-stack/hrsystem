const db = require('./config/db');

async function checkLahiru() {
    try {
        // 1. Find the employee
        const empRes = await db.query(`
            SELECT e.id, u.name, e.employee_id as emp_code 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Lahiru%' AND u.name ILIKE '%Nishshanka%'
        `);

        if (empRes.rows.length === 0) {
            console.log('Employee Lahiru Nishshanka not found.');
            process.exit(0);
        }

        const lahiru = empRes.rows[0];
        console.log('--- Employee Found ---');
        console.log(lahiru);

        // 2. Check Permanent Structure
        const structRes = await db.query(`
            SELECT sc.name, es.amount, es.quantity, es.is_locked, es.lock_reason
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
            ORDER BY sc.type, sc.name
        `, [lahiru.id]);

        console.log('\n--- Permanent Salary Structure ---');
        console.table(structRes.rows);

        // 3. Check Monthly Overrides for Feb 2026
        const overrideRes = await db.query(`
            SELECT sc.name, mo.amount, mo.quantity, mo.reason, mo.month
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1
            ORDER BY mo.month DESC
        `, [lahiru.id]);

        console.log('\n--- Monthly Overrides ---');
        console.table(overrideRes.rows);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLahiru();
