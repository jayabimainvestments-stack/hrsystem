const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkStandards() {
    try {
        console.log('--- Standard Budgetary Allowance Values ---');
        const res = await pool.query(`
            SELECT sc.name, es.amount, COUNT(*)
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE sc.name LIKE 'Budgetary Allowance%'
            GROUP BY sc.name, es.amount
            ORDER BY sc.name, COUNT(*) DESC
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStandards();
