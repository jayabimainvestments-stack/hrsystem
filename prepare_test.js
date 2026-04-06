const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function prepareForManualTesting() {
    try {
        console.log("--- PREPARING MARCH 2026 FOR MANUAL USER TESTING ---");
        
        // 1. Delete all March 2026 Payrolls
        await pool.query("DELETE FROM payroll WHERE month = '2026-03'");
        
        // 2. Delete all March 2026 Overrides (so user can see them being created)
        await pool.query("DELETE FROM monthly_salary_overrides WHERE month = '2026-03'");
        
        // 3. Delete all March 2026 Financial Requests (so user can click 'SEND TO PAYROLL')
        await pool.query("DELETE FROM financial_requests WHERE month = '2026-03'");

        console.log("SUCCESS: March 2026 is now a CLEAN SLATE.");
        console.log("You can now go to 'Fuel Allowance Management' and click 'SEND TO PAYROLL' yourself.");
        
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

prepareForManualTesting();
