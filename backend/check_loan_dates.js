const { Client } = require('pg');
require('dotenv').config();

async function checkLoanDates() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        const res = await client.query("SELECT * FROM employee_loans WHERE employee_id = 30");
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkLoanDates();
