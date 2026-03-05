const db = require('./config/db');
const { processApprovedRequest } = require('./services/financial.service');

async function syncAll() {
    console.log('--- STARTING SYNC OF APPROVED FINANCIAL REQUESTS ---');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing related overrides to avoid double counting if re-running
        // (Only for Salary Advance to test)
        // Actually, better to just let processApprovedRequest handle it if it uses upsert correctly

        const approvedRequests = await client.query("SELECT * FROM financial_requests WHERE status = 'Approved'");
        console.log(`Found ${approvedRequests.rows.length} approved requests.`);

        for (const req of approvedRequests.rows) {
            console.log(`Processing ID ${req.id} (${req.type}) for month ${req.month}...`);
            await processApprovedRequest(client, req);
        }

        await client.query('COMMIT');
        console.log('--- SYNC COMPLETED ---');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('SYNC FAILED:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

syncAll();
