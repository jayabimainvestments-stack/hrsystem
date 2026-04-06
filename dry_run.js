const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Mocking the getPayrollPreview logic from the controller
async function dryRunPrasanna() {
    const month = 'March';
    const year = '2026';
    const datePrefix = '2026-03';

    try {
        // 1. Get Employee
        const empRes = await pool.query("SELECT e.*, u.name, u.id as user_id FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name ILIKE '%Prasanna%'");
        const employee = empRes.rows[0];

        console.log(`Dry Run for ${employee.name} (UUID: ${employee.user_id})`);

        // 2. Mocking the API flow (I'll just call the database and log the merged components)
        // (Similar to my refactored code)
        
        const structureRes = await pool.query(`
            SELECT sc.name, ess.amount, ess.quantity, sc.id as component_id
            FROM employee_salary_structure ess
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE ess.employee_id = $1
        `, [employee.id]);

        const overridesRes = await pool.query(`
            SELECT sc.name, mo.amount, mo.quantity, mo.status, sc.id as component_id
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1 AND mo.month = $2 AND mo.status = 'Approved'
        `, [employee.id, datePrefix]);

        console.log("\n--- MERGED COMPONENTS ---");
        const overrideMap = {};
        overridesRes.rows.forEach(ov => overrideMap[ov.component_id] = ov);

        structureRes.rows.forEach(struct => {
            const ov = overrideMap[struct.component_id];
            if (ov) {
                console.log(`[OVERRIDE] ${struct.name}: ${ov.amount} (Qty: ${ov.quantity})`);
            } else {
                console.log(`[STRUCTURE] ${struct.name}: ${struct.amount}`);
            }
        });

        overridesRes.rows.forEach(ov => {
            if (!structureRes.rows.some(s => s.component_id === ov.component_id)) {
                console.log(`[STANDALONE] ${ov.name}: ${ov.amount}`);
            }
        });

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}
dryRunPrasanna();
