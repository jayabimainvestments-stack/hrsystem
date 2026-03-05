const { Client } = require('pg');
require('dotenv').config();

async function findLahiruLoans() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Find Lahiru in users table
        const userRes = await client.query("SELECT id, name FROM users WHERE name ILIKE '%LAHIRU%'");
        console.log('Users found:', userRes.rows);

        if (userRes.rows.length === 0) {
            console.log('No user found with name Lahiru');
            return;
        }

        for (const user of userRes.rows) {
            // Find employee record
            const empRes = await client.query("SELECT id FROM employees WHERE user_id = $1", [user.id]);
            console.log(`Employee for user ${user.name}:`, empRes.rows);

            if (empRes.rows.length > 0) {
                const empId = empRes.rows[0].id;
                // Find loans
                const loanRes = await client.query("SELECT * FROM employee_loans WHERE employee_id = $1", [empId]);
                console.log(`Loans for employee ${empId}:`, loanRes.rows);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

findLahiruLoans();
