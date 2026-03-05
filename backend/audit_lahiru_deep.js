const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function auditLahiru() {
    try {
        console.log('--- Employee Identification ---');
        const empRes = await pool.query(`
            SELECT e.id as emp_id, u.id as user_id, u.name 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE e.nic_passport = '200010080857'
        `);

        if (empRes.rows.length === 0) {
            console.log('Employee not found.');
            process.exit(0);
        }
        const { emp_id, user_id } = empRes.rows[0];
        console.log(`Found: ${empRes.rows[0].name} (Emp ID: ${emp_id}, User ID: ${user_id})`);

        console.log('\n--- Current Override Structure (employee_salary_structure) ---');
        const struct = await pool.query(`
            SELECT sc.name, es.amount, sc.id as component_id, sc.type, sc.status
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
            ORDER BY sc.name
        `, [emp_id]);
        console.table(struct.rows);

        console.log('\n--- Most Recent Payroll Details (payroll_details) ---');
        const lastPayroll = await pool.query(`
            SELECT pd.component_name, pd.amount, pd.type
            FROM payroll_details pd
            JOIN payroll p ON pd.payroll_id = p.id
            WHERE p.user_id = $1
            AND p.month = (SELECT MAX(month) FROM payroll WHERE user_id = $1)
            ORDER BY pd.component_name
        `, [user_id]);
        console.table(lastPayroll.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditLahiru();
