const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function completeDeepReset() {
    try {
        console.log("--- COMPLETE DEEP RESET FOR MARCH 2026 ---");
        const month = '2026-03';
        
        // 1. Delete Financial Requests
        await pool.query("DELETE FROM financial_requests WHERE month = $1", [month]);
        
        // 2. Delete Performance Approvals
        await pool.query("DELETE FROM performance_monthly_approvals WHERE month = $1", [month]);
        
        // 3. Delete Monthly Overrides
        await pool.query("DELETE FROM monthly_salary_overrides WHERE month = $1", [month]);
        
        // 4. Delete Payrolls
        await pool.query("DELETE FROM payroll WHERE month = $1", [month]);

        console.log("SUCCESS: March 2026 is now 100% EMPTY across all governance tables.");
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

completeDeepReset();
