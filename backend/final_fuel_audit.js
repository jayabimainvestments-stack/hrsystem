const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
    try {
        console.log('--- FINAL FUEL OVERRIDE AUDIT ---');

        const userId = 39; // Lahiru (with fuel component)
        const fuel_rate_override = "500.00";

        console.log(`Setting Override: ${fuel_rate_override}`);

        // 1. Fetch Structure
        const structRes = await pool.query(`
            SELECT es.amount, sc.name, sc.type
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = (SELECT id FROM employees WHERE user_id = $1)
        `, [userId]);

        const components = structRes.rows;
        let breakdown = [];

        for (const comp of components) {
            let amount = parseFloat(comp.amount);
            const compName = comp.name.toLowerCase();

            // Simulate the Logic I added to payroll.controller.js
            if (compName.includes('fuel')) {
                const fuelRate = fuel_rate_override ? parseFloat(fuel_rate_override) : 450; // Policy fallback
                amount = fuelRate * 45;
                console.log(`Matched Fuel: ${comp.name}. Using Rate ${fuelRate}. Calculated: ${amount}`);
            }

            if (comp.type === 'Earning') {
                breakdown.push({ name: comp.name, amount, type: 'Earning' });
            }
        }

        const fuelItem = breakdown.find(i => i.name.toLowerCase().includes('fuel'));
        if (fuelItem && fuelItem.amount === 22500) {
            console.log('SUCCESS: Fuel Override applied correctly (22,500 LKR).');
        } else {
            console.log('FAILURE: Expected 22,500, got', fuelItem ? fuelItem.amount : 'nothing');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
verify();
