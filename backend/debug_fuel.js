const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkFuel() {
    try {
        console.log('--- Finding Employee ---');
        const empRes = await pool.query(`
            SELECT e.id, u.name, e.nic_passport 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Pradeep Prasanna Bandara%' OR e.nic_passport = '980362710V'
        `);
        console.log('Employee:', empRes.rows[0]);
        const employeeId = empRes.rows[0]?.id;

        console.log('\n--- Fuel Components ---');
        const compRes = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%Fuel%'");
        console.log(compRes.rows);

        console.log('\n--- Fuel Rate in Policies ---');
        const policyRes = await pool.query("SELECT fuel_rate_per_liter FROM attendance_policies WHERE id = 1");
        console.log(policyRes.rows[0]);

        if (employeeId) {
            console.log(`\n--- Salary Structure for Employee ${employeeId} ---`);
            const ssRes = await pool.query(`
                SELECT ss.*, sc.name as component_name 
                FROM employee_salary_structure ss 
                JOIN salary_components sc ON ss.component_id = sc.id 
                WHERE ss.employee_id = $1
            `, [employeeId]);
            console.log(ssRes.rows);

            console.log(`\n--- Monthly Overrides for Employee ${employeeId} ---`);
            const moRes = await pool.query(`
                SELECT mo.*, sc.name as component_name 
                FROM monthly_salary_overrides mo 
                JOIN salary_components sc ON mo.component_id = sc.id 
                WHERE mo.employee_id = $1 AND mo.month = '2026-02'
            `, [employeeId]);
            console.log(moRes.rows);

            console.log(`\n--- Financial Requests for Fuel ---`);
            const frRes = await pool.query(`
                SELECT * FROM financial_requests 
                WHERE type ILIKE '%fuel%' OR type ILIKE '%petrol%'
                ORDER BY created_at DESC
            `);
            console.log(JSON.stringify(frRes.rows, null, 2));

            console.log(`\n--- Monthly Overrides for Employee 30 ---`);
            const moRes30 = await pool.query(`
                SELECT mo.*, sc.name as component_name 
                FROM monthly_salary_overrides mo 
                JOIN salary_components sc ON mo.component_id = sc.id 
                WHERE mo.employee_id = 30 AND mo.month = '2026-02'
            `);
            console.log(moRes30.rows);
        }

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await pool.end();
    }
}

checkFuel();
