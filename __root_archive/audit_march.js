const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkMarch() {
    try {
        console.log("--- MARCH 2026 PAYROLL AUDIT ---");
        
        // 1. Check Payroll Records
        const payroll = await pool.query(`
            SELECT u.name, p.month, p.net_salary, p.created_at 
            FROM payroll p JOIN users u ON p.user_id = u.id 
            WHERE p.month = '2026-03' 
            ORDER BY p.created_at DESC
        `);
        console.log("\nExisting March Payrolls:", payroll.rows.length);
        payroll.rows.forEach(r => console.log(`- ${r.name}: ${r.net_salary} (Created: ${r.created_at})`));

        // 2. Check Overrides for Prasanna
        const prasannaOverrides = await pool.query(`
            SELECT sc.name, mo.amount, mo.status, mo.month
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE u.name ILIKE '%Prasanna%' AND mo.month = '2026-03'
        `);
        console.log("\nPrasanna Overrides for March:");
        prasannaOverrides.rows.forEach(r => console.log(`- ${r.name}: ${r.amount} [${r.status}]`));

        // 3. Check Fuel Prices
        const fuel = await pool.query("SELECT * FROM fuel_price_history ORDER BY effective_from_date DESC LIMIT 2");
        console.log("\nFuel Price History:");
        fuel.rows.forEach(r => console.log(`- ${r.price_per_liter} LKR (Effective: ${r.effective_from_date})`));

        await pool.end();
    } catch (err) {
        console.error("Audit Error:", err);
        process.exit(1);
    }
}

checkMarch();
