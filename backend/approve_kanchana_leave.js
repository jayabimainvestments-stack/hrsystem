const db = require('./config/db');

async function approveKanchanaLeave() {
    try {
        console.log('--- ATTEMPTING TO APPROVE KANCHANA\'S LEAVE ---');

        // 1. Find a pending leave for Kanchana (User ID 18)
        const leaveRes = await db.query(`
            SELECT id, status, start_date 
            FROM leaves 
            WHERE user_id = 18 AND status = 'Pending' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (leaveRes.rows.length === 0) {
            console.log('No PENDING leave found for Kanchana.');
            process.exit(0);
        }

        const leaveId = leaveRes.rows[0].id;
        console.log(`Found Pending Leave ID: ${leaveId} (Start: ${leaveRes.rows[0].start_date})`);

        // 2. Simulate Approval by Admin (User ID 1)
        const updateRes = await db.query(
            "UPDATE leaves SET status = 'Approved', approved_by = 1 WHERE id = $1 RETURNING *",
            [leaveId]
        );

        console.log('✅ Leave Approved Successfully via Database Direct Update');
        console.log(updateRes.rows[0]);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

approveKanchanaLeave();
