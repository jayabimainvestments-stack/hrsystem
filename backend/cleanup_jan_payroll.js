const db = require('./config/db');

async function cleanupJanuary() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log('--- Cleaning up January Data ---');

        // 1. Identify payroll IDs for January
        const payrollRes = await client.query(
            "SELECT id FROM payroll WHERE month ILIKE '2026-01%' OR month ILIKE 'January%'"
        );
        const ids = payrollRes.rows.map(r => r.id);

        if (ids.length > 0) {
            console.log(`Found payroll IDs to delete: ${ids.join(', ')}`);

            // 2. Delete payroll details
            await client.query('DELETE FROM payroll_details WHERE payroll_id = ANY($1)', [ids]);
            console.log('✅ Deleted payroll_details.');

            // 3. Delete payroll records
            await client.query('DELETE FROM payroll WHERE id = ANY($1)', [ids]);
            console.log('✅ Deleted payroll records.');
        } else {
            console.log('No payroll records found for January.');
        }

        // 4. Delete/Reset liabilities for the months
        await client.query(
            "DELETE FROM payroll_liabilities WHERE month ILIKE '2026-01%' OR month ILIKE 'January%'"
        );
        console.log('✅ Deleted payroll_liabilities for January.');

        await client.query('COMMIT');
        console.log('\n--- Cleanup Successful ---');
        process.exit();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

cleanupJanuary();
