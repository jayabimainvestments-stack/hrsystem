const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixFuel() {
    try {
        console.log('--- Fixing Fuel Allowance Amounts for 2026-02 ---');

        // 1. Get current fuel rate
        const policyRes = await pool.query('SELECT fuel_rate_per_liter FROM attendance_policies WHERE id = 1');
        const rate = parseFloat(policyRes.rows[0].fuel_rate_per_liter);
        console.log(`Current Fuel Rate: ${rate} LKR/L`);

        if (!rate || rate <= 0) {
            throw new Error('Invalid fuel rate in policies');
        }

        // 2. Find "Monthly Fuel" component
        const compRes = await pool.query("SELECT id FROM salary_components WHERE name ILIKE '%Monthly Fuel%'");
        const fuelCompId = compRes.rows[0]?.id;

        if (!fuelCompId) {
            throw new Error('Monthly Fuel component not found');
        }

        // 3. Update overrides for 2026-02 where amount is 0 but quantity > 0
        const updateRes = await pool.query(`
            UPDATE monthly_salary_overrides 
            SET amount = quantity * $1,
                reason = reason || ' (Fixed calculation by AI)'
            WHERE month = '2026-02' 
            AND component_id = $2 
            AND (amount = 0 OR amount IS NULL) 
            AND quantity > 0
            RETURNING employee_id, quantity, (quantity * $1) as new_amount
        `, [rate, fuelCompId]);

        console.log(`Updated ${updateRes.rowCount} records.`);
        updateRes.rows.forEach(r => {
            console.log(`  Emp ID ${r.employee_id}: Qty ${r.quantity}L -> New Amount ${r.new_amount}`);
        });

    } catch (err) {
        console.error('FIX ERROR:', err);
    } finally {
        await pool.end();
    }
}

fixFuel();
