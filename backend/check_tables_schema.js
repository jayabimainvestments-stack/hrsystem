const { Client } = require('pg');
require('dotenv').config();

async function checkPayrollTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Check columns of payroll table
        const payrollCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payroll'
        `);
        console.log('Columns in payroll table:', payrollCols.rows);

        // Check columns of monthly_salary_overrides
        const overrideCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'monthly_salary_overrides'
        `);
        console.log('Columns in monthly_salary_overrides table:', overrideCols.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkPayrollTable();
