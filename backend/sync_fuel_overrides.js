const db = require('./config/db');
const { processApprovedRequest } = require('./services/financial.service');

async function syncFuelToOverrides() {
    const month = '2026-02';
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find the latest Approved Fuel request for Feb 2026
        const reqRes = await client.query(`
            SELECT * FROM financial_requests 
            WHERE month = $1 AND type ILIKE '%Fuel%' AND status = 'Approved'
            ORDER BY updated_at DESC LIMIT 1
        `, [month]);

        if (reqRes.rows.length === 0) {
            console.log('❌ No Approved Fuel request found for Feb 2026 to sync.');
            await client.query('ROLLBACK');
            process.exit(0);
        }

        const request = reqRes.rows[0];
        console.log(`✅ Found Approved Request ID: ${request.id}. Syncing to Monthly Overrides...`);

        // 2. Use the shared service to process/sync data
        await processApprovedRequest(client, request);

        console.log(`✅ Successfully synced Fuel Allowance for ${month} to Monthly Salary Overrides.`);

        await client.query('COMMIT');
        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Sync failed:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

syncFuelToOverrides();
