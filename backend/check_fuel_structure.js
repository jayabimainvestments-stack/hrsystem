const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        console.log('--- Krishantha (ID: 2) Salary Structure ---');
        const res = await pool.query(`
            SELECT es.*, sc.name, sc.type 
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = 2
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- Checking Fuel Allowance Status in Financial Requests ---');
        const res2 = await pool.query("SELECT * FROM financial_requests WHERE month = '2026-02' AND type = 'Fuel Allowance'");
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
