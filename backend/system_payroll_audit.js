const { Client } = require('pg');
require('dotenv').config();

async function systemAudit() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        console.log('--- AUDIT 1: Duplicate Loans ---');
        const loanDuplicates = await client.query(`
            SELECT employee_id, total_amount, installment_amount, start_date, COUNT(*) 
            FROM employee_loans 
            WHERE status != 'Rejected'
            GROUP BY employee_id, total_amount, installment_amount, start_date
            HAVING COUNT(*) > 1
        `);
        if (loanDuplicates.rows.length > 0) {
            console.table(loanDuplicates.rows);
            // Get specific IDs for these duplicates
            for (const row of loanDuplicates.rows) {
                const ids = await client.query(`
                    SELECT id, employee_id, total_amount, created_at FROM employee_loans 
                    WHERE employee_id = $1 AND total_amount = $2 AND start_date = $3
                `, [row.employee_id, row.total_amount, row.start_date]);
                console.log(`Potential duplicate IDs for Employee ${row.employee_id}:`, ids.rows);
            }
        } else {
            console.log('No duplicate loans found.');
        }

        console.log('\n--- AUDIT 2: Zero Fuel Amounts in Structure ---');
        const zeroFuel = await client.query(`
            SELECT es.employee_id, u.name, es.component_id, es.amount, es.quantity
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE sc.name ILIKE '%fuel%' AND es.amount = 0 AND es.quantity > 0
        `);
        if (zeroFuel.rows.length > 0) {
            console.table(zeroFuel.rows);
        } else {
            console.log('No zero fuel amounts found.');
        }

        console.log('\n--- AUDIT 3: Salary Advances in Baseline ---');
        const recurringAdvances = await client.query(`
            SELECT es.employee_id, u.name, es.component_id, sc.name as component_name, es.amount
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE (sc.name ILIKE '%advance%' OR sc.name ILIKE '%loan%')
            AND sc.name NOT ILIKE '%installment%'
        `);
        if (recurringAdvances.rows.length > 0) {
            console.table(recurringAdvances.rows);
        } else {
            console.log('No recurring advance/loan components found in baseline.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

systemAudit();
