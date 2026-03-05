const db = require('./config/db');

async function cleanup() {
    try {
        console.log('Cleaning up permanent salary structure from monthly variables...');

        // 1. Delete 'No Pay' components from permanent structure (they are now monthly overrides)
        const noPayRes = await db.query("SELECT id FROM salary_components WHERE name = 'No Pay'");
        if (noPayRes.rows.length > 0) {
            const noPayId = noPayRes.rows[0].id;
            const delRes = await db.query("DELETE FROM employee_salary_structure WHERE component_id = $1", [noPayId]);
            console.log(`Deleted ${delRes.rowCount} 'No Pay' entries from permanent structure.`);
        }

        // 2. Unlock components that were locked by monthly fuel requests or advances
        // Usually these have 'Approved' in the lock_reason
        const unlockRes = await db.query(`
            UPDATE employee_salary_structure 
            SET is_locked = false, lock_reason = NULL, amount = 0
            WHERE is_locked = true AND (lock_reason ILIKE '%Approved%' OR lock_reason ILIKE '%Fuel%')
        `);
        console.log(`Unlocked ${unlockRes.rowCount} components in permanent structure.`);

        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
