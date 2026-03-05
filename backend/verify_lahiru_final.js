const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function verifyLahiru() {
    try {
        console.log('=== FINAL VERIFICATION: LAHIRU NISHSHANKA ===');
        const res = await pool.query(`
            SELECT sc.name, es.amount, sc.id as component_id
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.nic_passport = '200010080857'
            ORDER BY sc.name
        `);
        console.table(res.rows);

        const statutory = res.rows.filter(r => ['Basic Salary', 'Budgetary Allowance 1', 'Budgetary Allowance 2'].includes(r.name));
        const totalStat = statutory.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        console.log(`\nTotal Statutory Pay: ${totalStat}`);
        console.log(`Expected: 30000`);

        if (totalStat !== 30000) {
            console.error('CRITICAL: Total Statutory Pay mismatch!');
        } else {
            console.log('Statutory Pay verified.');
        }

        const loanComps = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%Staff Loan%'");
        console.log('\nRemaining Staff Loan Components:');
        console.table(loanComps.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyLahiru();
