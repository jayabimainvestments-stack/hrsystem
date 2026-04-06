const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function deepResetMarch() {
    try {
        console.log("--- MARCH 2026 DEEP RESET ---");
        
        // 1. Delete Payroll Records
        const pCount = await pool.query("DELETE FROM payroll WHERE month = '2026-03'");
        console.log(`Deleted ${pCount.rowCount} payroll records.`);

        // 2. Delete Monthly Overrides
        const oCount = await pool.query("DELETE FROM monthly_salary_overrides WHERE month = '2026-03'");
        console.log(`Deleted ${oCount.rowCount} monthly overrides.`);

        // 3. Delete Financial Requests (Manual Adjustments)
        const fCount = await pool.query("DELETE FROM financial_requests WHERE month = '2026-03'");
        console.log(`Deleted ${fCount.rowCount} financial requests.`);

        console.log("\n--- RE-INSERTING APPROVED OVERRIDES (REFINEMENT) ---");
        
        // Data derived from previous audits
        const overrides = [
            { name: 'Prasanna', comp: 'Monthly Performance', amt: 10000, qty: 0 },
            { name: 'Prasanna', comp: 'Monthly Fuel', amt: 20839, qty: 65 },
            { name: 'Nishshankage', comp: 'Monthly Performance', amt: 10000, qty: 0 },
            { name: 'Nishshankage', comp: 'Monthly Fuel', amt: 20839, qty: 65 },
            { name: 'Mayuri', comp: 'Monthly Performance', amt: 3000, qty: 0 },
            { name: 'KRISHANTHA', comp: 'Basic Salary', amt: 30000, qty: 0 },
            { name: 'KRISHANTHA', comp: 'Travelling', amt: 65000, qty: 0 },
            { name: 'KRISHANTHA', comp: 'Monthly Performance', amt: 0, qty: 0 }
        ];

        for (const ov of overrides) {
            const empRes = await pool.query("SELECT e.id FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name ILIKE $1", [`%${ov.name}%`]);
            const compRes = await pool.query("SELECT id FROM salary_components WHERE name ILIKE $1", [`%${ov.comp}%`]);
            
            if (empRes.rows.length > 0 && compRes.rows.length > 0) {
                const emp_id = empRes.rows[0].id;
                const comp_id = compRes.rows[0].id;
                
                await pool.query(`
                    INSERT INTO monthly_salary_overrides (employee_id, component_id, month, amount, quantity, status, reason)
                    VALUES ($1, $2, '2026-03', $3, $4, 'Approved', 'Refined for March Baseline Transparency')
                `, [emp_id, comp_id, ov.amt, ov.qty]);
                console.log(`- Inserted Approved ${ov.comp} for ${ov.name}`);
            }
        }

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

deepResetMarch();
