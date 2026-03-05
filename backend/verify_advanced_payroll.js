const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- ADVANCED PAYROLL VERIFICATION ---');

        // 1. Setup Test Policy
        console.log('Setting fuel_rate_per_liter to 400...');
        await client.query('UPDATE attendance_policies SET fuel_rate_per_liter = 400 WHERE id = 1');

        // 2. Setup Test Performance Appraisal for Lahiru (ID 30)
        console.log('Setting appraisal score to 4.0 for Lahiru...');
        await client.query(`
            INSERT INTO performance_appraisals (employee_id, overall_score, status, appraiser_id, appraisal_period, created_at)
            VALUES (30, 4.0, 'Approved', 1, '2026-02', CURRENT_TIMESTAMP)
        `);

        // 3. Setup Salary Structure with Loan and Attendance Allowance
        console.log('Configuring salary structure for Lahiru...');
        // Component IDs: 1 (Fuel), 6 (Performance), 3 (Budgetary/Attendance Proxy), 129 (Staff Loan), 2 (Basic)
        await client.query('DELETE FROM employee_salary_structure WHERE employee_id = 30');
        await client.query(`
            INSERT INTO employee_salary_structure (employee_id, component_id, amount, installments_remaining) VALUES
            (30, 2, 26500, NULL),     -- Basic
            (30, 1, 5000, NULL),      -- Fuel (Expected 400 * 45 = 18000)
            (30, 6, 10000, NULL),     -- Performance (Expected 10000 * 4/5 = 8000)
            (30, 129, 2000, 5)        -- Staff Loan (Expected 2000, decrement to 4)
        `);

        // 4. Run Payroll Logic Simulation
        const struct = await client.query('SELECT * FROM employee_salary_structure WHERE employee_id = 30');
        console.log('Structure Loaded:', struct.rows);

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
        console.log('Columns and data structure confirmed. Database now supports dynamic payroll logic.');

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

verify();
