const db = require('./config/db');

const deleteRequests = async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Revert changes for Approved Request (ID 1)
        // We need to identify which employees were affected. 
        // We can get this from the request data before deleting, or just unlock ALL fuel components?
        // Safer to unlock all 'Fuel Allowance' components that are currently locked with reason including 'Approved Fuel Allowance - 2026-02'.

        console.log("Unlocking salary structures...");
        const unlockRes = await client.query(`
            UPDATE employee_salary_structure
            SET is_locked = false, lock_reason = NULL
            WHERE lock_reason LIKE '%Fuel Allowance - 2026-02%'
        `);
        console.log(`Unlocked ${unlockRes.rowCount} salary records.`);

        // 2. Delete the requests
        console.log("Deleting requests...");
        const deleteRes = await client.query(`
            DELETE FROM financial_requests 
            WHERE id IN (1, 2)
        `);
        console.log(`Deleted ${deleteRes.rowCount} requests.`);

        await client.query('COMMIT');
        console.log("Cleanup successful.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error during cleanup:", error);
    } finally {
        client.release();
        process.exit();
    }
};

deleteRequests();
