const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
    try {
        const compId = 1; // Monthly Fuel
        const res = await pool.query(
            "SELECT count(*) FROM employee_salary_structure WHERE component_id = $1 AND (amount > 0 OR is_locked = true)",
            [compId]
        );
        console.log(`Employees with non-zero or locked fuel allowances: ${res.rows[0].count}`);

        const reqRes = await pool.query(
            "SELECT count(*) FROM financial_requests WHERE month = '2026-02' AND type ILIKE '%Fuel%'"
        );
        console.log(`Remaining February fuel requests: ${reqRes.rows[0].count}`);

    } catch (e) {
        console.error('Verification error:', e);
    } finally {
        await pool.end();
    }
}

verify();
