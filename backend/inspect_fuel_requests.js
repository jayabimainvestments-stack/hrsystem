const db = require('./config/db');

const inspectRequests = async () => {
    try {
        const res = await db.query(`
            SELECT id, month, type, status, created_at, requested_by 
            FROM financial_requests 
            ORDER BY created_at DESC
        `);
        console.table(res.rows);
    } catch (error) {
        console.error(error);
    } finally {
        // Close the pool? No, just exit.
        process.exit();
    }
};

inspectRequests();
