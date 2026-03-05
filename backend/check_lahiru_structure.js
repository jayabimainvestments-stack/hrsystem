const { Client } = require('pg');
require('dotenv').config();

async function checkLahiruStructure() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Check employee_salary_structure for employee 30
        const res = await client.query(`
            SELECT es.*, sc.name 
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = 30
        `);
        console.log('Salary structure for Lahiru (30):', res.rows);

        // Check monthly_salary_overrides too
        const overrides = await client.query(`
            SELECT mo.*, sc.name 
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = 30
        `);
        console.log('Monthly overrides for Lahiru (30):', overrides.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkLahiruStructure();
