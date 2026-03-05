const db = require('./config/db');

/**
 * Cleanup Script: Remove absences where approved leaves exist
 * This fixes old data where leaves were approved before the auto-delete feature
 */

async function cleanupAbsences() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("\n=== CLEANING UP CONFLICTING ABSENCES ===\n");

        // Find and delete absences that have approved leaves
        const deleteResult = await client.query(`
            DELETE FROM attendance
            WHERE id IN (
                SELECT a.id
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                JOIN leaves l ON l.user_id = e.user_id
                WHERE a.status = 'Absent'
                AND l.status = 'Approved'
                AND a.date >= l.start_date::date
                AND a.date <= l.end_date::date
            )
            RETURNING *
        `);

        if (deleteResult.rowCount > 0) {
            console.log(`🗑️  Deleted ${deleteResult.rowCount} conflicting absence record(s):\n`);
            deleteResult.rows.forEach(row => {
                console.log(`   - Employee ${row.employee_id}, Date: ${row.date.toISOString().split('T')[0]}`);
            });
        } else {
            console.log("✅ No conflicting absences found. Data is clean.");
        }

        await client.query('COMMIT');
        console.log("\n✅ CLEANUP COMPLETE!\n");
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

cleanupAbsences();
