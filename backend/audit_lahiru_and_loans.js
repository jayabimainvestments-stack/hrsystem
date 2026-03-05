const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runAudit() {
    try {
        console.log('\n=== AUDIT: STAFF LOAN DUPLICATES ===');
        const loanDups = await pool.query(`
            SELECT u.name, sc.name as component, es.amount, sc.id as component_id
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE sc.name ILIKE '%Staff Loan%'
            ORDER BY u.name, sc.name
        `);
        console.table(loanDups.rows);

        // Group by employee name to see who has both
        const grouped = {};
        loanDups.rows.forEach(row => {
            if (!grouped[row.name]) grouped[row.name] = [];
            grouped[row.name].push(row);
        });

        console.log('\nEmployees with both Staff Loan components:');
        Object.entries(grouped).forEach(([name, components]) => {
            if (components.length > 1) {
                console.log(`- ${name} has ${components.length} loan components.`);
            }
        });

        console.log('\n=== AUDIT: LAHIRU NISHSHANKA SPECIFIC ===');
        const lahiru = await pool.query(`
            SELECT sc.name, es.amount
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.nic_passport = '200010080857'
            ORDER BY sc.type, sc.name
        `);
        console.table(lahiru.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runAudit();
