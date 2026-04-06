const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Mocking the getConsolidatedBaseline logic
async function verifyBaselineSync() {
    try {
        console.log("--- BASELINE SYNC VERIFICATION (MARCH 2026) ---");
        const month = '2026-03';
        
        // 1. Check Fuel Overrides
        const fuelRes = await pool.query(`
            SELECT u.name, mo.amount, mo.quantity, mo.reason
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE mo.month = $1 AND mo.component_id IN (SELECT id FROM salary_components WHERE name ILIKE '%fuel%')
        `, [month]);

        console.log("Fuel Overrides in DB for March:");
        fuelRes.rows.forEach(r => {
            console.log(`- ${r.name}: Rs ${r.amount} (Qty: ${r.quantity})`);
            console.log(`  Reason: ${r.reason}`);
        });

        const totalFuel = fuelRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        console.log(`\nTotal Fuel Impact: Rs ${totalFuel.toFixed(2)}`);
        
        if (totalFuel === 41678) {
            console.log("MATCHES SCREENSHOT! ✅");
        } else {
            console.log(`MISMATCH! Expected 41678, got ${totalFuel} ❌`);
        }

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

verifyBaselineSync();
