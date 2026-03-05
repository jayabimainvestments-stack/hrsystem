const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Checking Welfare Naming in Details ---');
        const res = await pool.query(`
            SELECT component_name, SUM(CAST(amount AS NUMERIC)) as total_amount, COUNT(*) as record_count 
            FROM payroll_details pd 
            JOIN payroll p ON pd.payroll_id = p.id 
            WHERE p.month = '2026-02' 
            AND pd.component_name ILIKE '%Welfare%' 
            GROUP BY component_name
        `);
        console.log(res.rows);

        console.log('\n--- Checking Mayuri Eligibility & Data ---');
        const mayuriRes = await pool.query(`
            SELECT e.id, u.name, e.is_epf_eligible, e.is_etf_eligible, e.employment_status, u.id as user_id
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Mayuri%'
        `);
        console.log(mayuriRes.rows);

        const m = mayuriRes.rows[0];
        if (m) {
            const hasSalary = await pool.query("SELECT COUNT(*) FROM employee_salary_structure WHERE employee_id = $1", [m.id]);
            console.log(`Mayuri (Emp ${m.id}) Salary Components: ${hasSalary.rows[0].count}`);

            const hasOverrides = await pool.query("SELECT COUNT(*) FROM monthly_salary_overrides WHERE employee_id = $1 AND month = '2026-02'", [m.id]);
            console.log(`Mayuri (Emp ${m.id}) Overrides for Feb 2026: ${hasOverrides.rows[0].count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
