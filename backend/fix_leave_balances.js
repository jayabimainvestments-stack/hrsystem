const db = require('./config/db');

async function fixBalances() {
    try {
        console.log('--- FIXING LEAVE BALANCES ---');

        // 1. Calculate actual usage from leaves table
        const usageRes = await db.query(`
            SELECT 
                user_id, 
                leave_type_id, 
                COALESCE(SUM(paid_days), 0) as actual_used
            FROM leaves 
            WHERE status = 'Approved' 
            AND start_date >= '2026-01-01' AND start_date <= '2026-12-31'
            GROUP BY user_id, leave_type_id
        `);

        console.log(`Found ${usageRes.rows.length} usage records to sync.`);

        for (const usage of usageRes.rows) {
            // 2. Update balances
            // We set used_days = actual_used
            // And remaining_days = allocated - actual_used 
            // (assuming annual_limit/allocated_days is static or we trust current allocated_days)
            // Ideally we should know allocated days. leave_balances usually has 'allocated_days' column?

            const actualUsed = parseFloat(usage.actual_used);

            const updateRes = await db.query(`
                UPDATE leave_balances 
                SET used_days = $1::numeric
                WHERE user_id = $2 AND leave_type_id = $3
                RETURNING *
            `, [actualUsed, usage.user_id, usage.leave_type_id]);

            if (updateRes.rows.length > 0) {
                console.log(`User ${usage.user_id} Type ${usage.leave_type_id}: Set used=${usage.actual_used}, remaining=${updateRes.rows[0].remaining_days}`);
            } else {
                console.warn(`No balance record found for User ${usage.user_id} Type ${usage.leave_type_id} - Skipping update (or should insert?)`);
            }
        }

        // 3. Reset balances to 0 for those with NO approved leaves?
        // This is important. If I deleted a leave, the balance should revert.
        // My query above only gets Positive usage.
        // I should also find balances where used_days > 0 BUT no matching approved leave exists.

        const zeroRes = await db.query(`
             UPDATE leave_balances lb
             SET used_days = 0
             WHERE year = 2026
             AND (user_id, leave_type_id) NOT IN (
                SELECT user_id, leave_type_id 
                FROM leaves 
                WHERE status = 'Approved' 
                AND start_date >= '2026-01-01' AND start_date <= '2026-12-31'
             )
             AND used_days > 0
             RETURNING *
        `);

        if (zeroRes.rows.length > 0) {
            console.log(`Reset ${zeroRes.rows.length} records to 0 usage (no approved leaves found).`);
        }

        console.log('--- FIX COMPLETE ---');
        if (db.pool) await db.pool.end();

    } catch (error) {
        console.error(error);
        if (db.pool) await db.pool.end();
        process.exit(1);
    }
}

fixBalances();
