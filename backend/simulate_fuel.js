const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function simulate() {
    try {
        const user_id = '30'; // Lahiru's user_id or employee_id? 
        // In my logic, req.body usually has user_id or employee_id.
        // Let's check the controller signature.

        console.log('--- PAYROLL SIMULATION ---');

        // Use Employee ID 30
        const empId = 30;

        const structRes = await pool.query(`
            SELECT es.amount, sc.name, sc.type, sc.is_taxable, sc.epf_eligible, sc.etf_eligible, sc.welfare_eligible,
                   es.installments_remaining, es.component_id
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
        `, [empId]);

        const components = structRes.rows;
        const policyRes = await pool.query('SELECT * FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];

        let results = [];
        for (const comp of components) {
            let amount = parseFloat(comp.amount);
            const compName = comp.name.toLowerCase();

            // --- Dynamic: Fuel Allowance ---
            if (compName.includes('fuel')) {
                const fuelRate = parseFloat(policy?.fuel_rate_per_liter || 0);
                amount = fuelRate * 45;
                console.log(`Detected Fuel Component: ${comp.name}, Base: ${comp.amount}, Calculated: ${amount} (Rate: ${fuelRate})`);
            }
            results.push({ name: comp.name, amount });
        }

        console.log('Breakdown Results:', results);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
simulate();
