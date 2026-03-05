const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function auditHistoricalLoans() {
    try {
        console.log('--- Historical Payroll Component Usage ---');
        const res = await pool.query(`
            SELECT component_name, type, COUNT(*) as occurrence_count
            FROM payroll_details
            WHERE component_name ILIKE '%Staff Loan%' OR component_name ILIKE '%Loan%'
            GROUP BY component_name, type
            ORDER BY occurrence_count DESC
        `);
        console.table(res.rows);

        const res2 = await pool.query(`
            SELECT sc.id, sc.name, sc.status, COUNT(es.id) as assignment_count
            FROM salary_components sc
            LEFT JOIN employee_salary_structure es ON sc.id = es.component_id
            WHERE sc.name ILIKE '%Staff Loan%' OR sc.name ILIKE '%Loan%'
            GROUP BY sc.id, sc.name, sc.status
            ORDER BY sc.name
        `);
        console.log('\n--- Master Component List Status ---');
        console.table(res2.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditHistoricalLoans();
