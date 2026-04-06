const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function simulateAllMarch() {
    try {
        const month = 'March';
        const year = '2026';
        const datePrefix = '2026-03';
        
        const employees = await pool.query("SELECT e.id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE employment_status = 'Active'");
        
        console.log(`--- MARCH 2026 FINAL SIMULATION (${employees.rows.length} Employees) ---`);

        for (const emp of employees.rows) {
            console.log(`\nEmployee: ${emp.name}`);
            
            // 1. Structure
            const structure = await pool.query(`
                SELECT sc.name, ess.amount, ess.component_id as comp_id
                FROM employee_salary_structure ess
                JOIN salary_components sc ON ess.component_id = sc.id
                WHERE ess.employee_id = $1
            `, [emp.id]);

            // 2. Approved Overrides
            const overrides = await pool.query(`
                SELECT sc.name, mo.amount, mo.component_id as comp_id
                FROM monthly_salary_overrides mo
                JOIN salary_components sc ON mo.component_id = sc.id
                WHERE mo.employee_id = $1 AND mo.month = $2 AND mo.status = 'Approved'
            `, [emp.id, datePrefix]);

            const overrideMap = {};
            overrides.rows.forEach(ov => overrideMap[ov.comp_id] = ov);

            let totalEarnings = 0;
            let components = [];

            structure.rows.forEach(s => {
                const ov = overrideMap[s.comp_id];
                const amt = ov ? parseFloat(ov.amount) : parseFloat(s.amount);
                const source = ov ? "OVERRIDE" : "STRUCTURE";
                components.push(`${s.name}: Rs ${amt} (${source})`);
                totalEarnings += amt;
            });

            overrides.rows.forEach(ov => {
                if (!structure.rows.some(s => s.comp_id === ov.comp_id)) {
                    const amt = parseFloat(ov.amount);
                    components.push(`${ov.name}: Rs ${amt} (STANDALONE)`);
                    totalEarnings += amt;
                }
            });

            components.forEach(c => console.log(`  - ${c}`));
            console.log(`  TOTAL EARNINGS: Rs ${totalEarnings.toFixed(2)}`);
        }
        
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

simulateAllMarch();
