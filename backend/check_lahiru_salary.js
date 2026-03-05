const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function findEmployee() {
    try {
        console.log('Searching for employee: NISHSHANKAGE LAHIRU WITHUNGA NISHSHANKA (200010080857)');
        const res = await pool.query(`
            SELECT e.id as emp_id, u.name, e.nic_passport 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE e.nic_passport = '200010080857'
        `);

        if (res.rows.length === 0) {
            console.log('Employee not found.');
            process.exit(0);
        }

        const empId = res.rows[0].emp_id;
        const struct = await pool.query(`
            SELECT es.id as structure_id, sc.name as component_name, es.amount, sc.id as component_id
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
            ORDER BY sc.type, sc.name
        `, [empId]);

        console.log('Current Salary Structure:');
        console.table(struct.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findEmployee();
