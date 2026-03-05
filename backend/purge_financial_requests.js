const db = require('./config/db');

async function purgeFinancialRequests() {
    try {
        console.log('--- PURGING FINANCIAL REQUESTS HISTORY ---');

        // Check for related tables first to avoid FK constraints issues if any
        // Based on typical schema, there might be financial_request_items

        const tablesRes = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'financial_%'");
        const tableNames = tablesRes.rows.map(r => r.table_name);

        if (tableNames.includes('financial_request_items')) {
            const resItems = await db.query('DELETE FROM financial_request_items');
            console.log(`Deleted ${resItems.rowCount} rows from financial_request_items.`);
        }

        const resReqs = await db.query('DELETE FROM financial_requests');
        console.log(`Deleted ${resReqs.rowCount} rows from financial_requests.`);

        console.log('--- PURGE COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('Purge Failed:', error);
        process.exit(1);
    }
}

purgeFinancialRequests();
