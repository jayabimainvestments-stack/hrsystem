const db = require('./config/db');
require('dotenv').config();
const { approveAllMonthlyPerformance } = require('./controllers/performance.controller');

async function trigger() {
    try {
        console.log('Triggering Performance Re-calculation for 2026-02...');

        // Mocking req/res for approveAllMonthlyPerformance
        const req = {
            body: { month: '2026-02' },
            user: { id: 36 } // Admin (Krishantha)
        };
        const res = {
            status: (code) => ({
                json: (data) => console.log(`Response [${code}]:`, data)
            })
        };

        await approveAllMonthlyPerformance(req, res);

        // After calculation, approve all Drafts in monthly_salary_overrides
        console.log('Finalizing Approvals (Draft -> Approved)...');
        await db.query(`
            UPDATE monthly_salary_overrides 
            SET status = 'Approved' 
            WHERE month = '2026-02' AND status = 'Draft'
        `);

        console.log('All February data integrated and approved.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
trigger();
