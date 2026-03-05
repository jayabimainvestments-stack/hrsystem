const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Schema for relevant tables ---');
        const schemaRes = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('performance_weekly_data', 'performance_monthly_approvals', 'employee_salary_structure', 'financial_requests', 'monthly_salary_overrides') 
            ORDER BY table_name, ordinal_position
        `);

        const schema = {};
        schemaRes.rows.forEach(row => {
            if (!schema[row.table_name]) schema[row.table_name] = [];
            schema[row.table_name].push(row.column_name);
        });
        console.log('Table Schemas:', JSON.stringify(schema, null, 2));

        console.log('\n--- Hasitha (ID 28) Salary Structure ---');
        const ssRes = await pool.query(`
            SELECT ss.*, sc.name as component_name 
            FROM employee_salary_structure ss 
            JOIN salary_components sc ON ss.component_id = sc.id 
            WHERE ss.employee_id = 28
        `);
        ssRes.rows.forEach(row => {
            console.log(`Component: ${row.name || row.component_name}, Amount: ${row.amount}`);
        });

        console.log('\n--- Hasitha (ID 28) Weekly Performance Data ---');
        // We now know the columns from the schema check above, but let's just select all
        const pwdRes = await pool.query("SELECT * FROM performance_weekly_data WHERE employee_id = 28");
        console.log('Weekly Performance:', pwdRes.rows);

        console.log('\n--- Hasitha (ID 28) Monthly Performance Approvals ---');
        const pmaRes = await pool.query("SELECT * FROM performance_monthly_approvals WHERE employee_id = 28");
        console.log('Monthly Approvals:', pmaRes.rows);

        console.log('\n--- Salary Advance Components ---');
        const scRes = await pool.query("SELECT * FROM salary_components WHERE name ILIKE '%advance%'");
        console.log('Advance Components:', scRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
