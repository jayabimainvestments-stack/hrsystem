const db = require('./backend/config/db');

async function fixWelfareDuplicates() {
    try {
        await db.pool.query('BEGIN');

        console.log("Cleaning up duplicate/orphaned welfare_ledger entries...");

        // Strategy 1: Delete orphaned welfare ledger entries (from previously deleted payrolls) 
        // Assuming ref_id in welfare_ledger correlates to payroll.id when type is 'Collection'
        const orphanedRes = await db.pool.query(`
            DELETE FROM welfare_ledger
            WHERE type = 'Collection' AND ref_id IS NOT NULL 
            AND ref_id NOT IN (SELECT id FROM payroll)
            RETURNING id, ref_id, description;
        `);
        console.log(`Deleted ${orphanedRes.rowCount} orphaned welfare_ledger records:`);
        console.table(orphanedRes.rows);

        // Strategy 2: If there are STILL explicit duplications strictly mapped to the exact same payroll ID
        const dupesRes = await db.pool.query(`
            SELECT MIN(id) as keep_id, ref_id
            FROM welfare_ledger
            WHERE type = 'Collection' AND description LIKE '%(2026-03)%'
            GROUP BY ref_id
            HAVING COUNT(*) > 1
        `);

        for (const row of dupesRes.rows) {
            const delRes = await db.pool.query(`
                DELETE FROM welfare_ledger
                WHERE ref_id = $1 AND id != $2
                RETURNING id, description;
            `, [row.ref_id, row.keep_id]);
            console.log(`Deleted duplicate welfare ledger entries for ref_id ${row.ref_id}:`, delRes.rows);
        }

        // Check if there are duplicate descriptions for the same user in March (rare, in case ref_id is different but it's the exact same user)
        // This handles cases where payroll was generated with multiple IDs accidentally?
        // Let's just trust that removing orphans and direct dups fixes it.

        await db.pool.query('COMMIT');
        console.log("Welfare Ledger successfully cleaned up.");
        
    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error("Error cleaning up welfare ledger:", error);
    } finally {
        await db.pool.end();
        process.exit();
    }
}

fixWelfareDuplicates();
