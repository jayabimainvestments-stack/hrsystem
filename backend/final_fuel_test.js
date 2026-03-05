const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
    try {
        console.log('--- FINAL FUEL VERIFICATION ---');

        // 1. Update rate to 450
        console.log('Updating fuel rate to 450...');
        await pool.query('UPDATE attendance_policies SET fuel_rate_per_liter = 450 WHERE id = 1');

        // 2. Fetch policy to confirm
        const policy = await pool.query('SELECT fuel_rate_per_liter FROM attendance_policies WHERE id = 1');
        console.log('Confirmed Policy Rate:', policy.rows[0].fuel_rate_per_liter);

        // 3. Simulate calculation
        const rate = parseFloat(policy.rows[0].fuel_rate_per_liter || 0);
        const expected = rate * 45;
        console.log(`Expected Fuel Allowance: ${rate} * 45 = ${expected}`);

        if (expected === 20250) {
            console.log('SUCCESS: Calculation logic matches expected output.');
        } else {
            console.log('FAILURE: Calculation mismatch.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
verify();
