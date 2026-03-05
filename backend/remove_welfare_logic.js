const db = require('./config/db');

async function removeWelfare() {
    console.log('--- REMOVING WELFARE ELIGIBILITY ---');
    try {
        await db.query('BEGIN');

        // 1. Set welfare_eligible to false for ALL components
        console.log('Setting welfare_eligible = false for all components...');
        await db.query("UPDATE salary_components SET welfare_eligible = false");

        // 2. Ensure Basic pay is exactly 30,000 (already simplified in previous step, but let's be sure)
        const basicRes = await db.query("SELECT id FROM salary_components WHERE name = 'Basic pay'");
        const basicId = basicRes.rows[0]?.id;

        if (basicId) {
            await db.query("UPDATE employee_salary_structure SET amount = 30000 WHERE component_id = $1", [basicId]);
        }

        await db.query('COMMIT');
        console.log('✅ Welfare eligibility removed successfully!');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error('❌ Error removing welfare:', e);
    } finally {
        process.exit();
    }
}

removeWelfare();
