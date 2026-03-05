const db = require('./config/db');

async function verifyFuelAllowance() {
    const month = '2026-02';
    try {
        console.log(`--- Checking Fuel Allowance Status for ${month} ---`);

        // 1. Check financial_requests table
        const reqRes = await db.query(`
            SELECT id, type, status, approved_by, created_at 
            FROM financial_requests 
            WHERE month = $1 AND type ILIKE '%Fuel%'
            ORDER BY created_at DESC LIMIT 1
        `, [month]);

        if (reqRes.rows.length === 0) {
            console.log('❌ No Fuel Allowance request found in financial_requests for Feb 2026.');
        } else {
            const request = reqRes.rows[0];
            console.log('✅ Request Found:');
            console.table(reqRes.rows);

            if (request.status === 'Approved') {
                console.log('✅ Request is APPROVED.');
            } else {
                console.log(`⚠️ Request Status is: ${request.status}. If it's not Approved, it won't be in Overrides.`);
            }
        }

        // 2. Check monthly_salary_overrides table
        const overrideRes = await db.query(`
            SELECT mo.id, u.name as employee_name, sc.name as component, mo.amount, mo.quantity, mo.reason
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.month = $1 AND sc.name ILIKE '%Fuel%'
        `, [month]);

        console.log('\n--- Monthly Salary Overrides (Fuel) ---');
        if (overrideRes.rows.length === 0) {
            console.log('❌ No fuel data found in monthly_salary_overrides for this month.');
        } else {
            console.table(overrideRes.rows);
            console.log(`✅ Total employees with fuel overrides: ${overrideRes.rows.length}`);
        }

        // 3. Double check Permanent Structure (It should NOT have these amounts updated)
        const structRes = await db.query(`
            SELECT u.name, sc.name as component, es.amount, es.is_locked, es.lock_reason
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE sc.name ILIKE '%Fuel%' AND es.amount > 0
            LIMIT 5
        `);

        console.log('\n--- Permanent Structure Check (Should be baseline/clean) ---');
        if (structRes.rows.length === 0) {
            console.log('✅ Permanent structure is clean of temporary fuel amounts.');
        } else {
            console.log('⚠️ Some permanent records still have fuel amounts. If these are baseline quotas, it is OK.');
            console.table(structRes.rows);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
}

verifyFuelAllowance();
