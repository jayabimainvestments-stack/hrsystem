const db = require('./config/db');

async function removeDuplicateNoPay() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- Removing Duplicate NOPAY Component ---");

        // Get both NOPAY components
        const result = await client.query("SELECT id, name FROM salary_components WHERE UPPER(name) IN ('NOPAY', 'NO PAY') ORDER BY id");
        console.table(result.rows);

        if (result.rows.length > 1) {
            // Keep 'No Pay' (ID 19), remove 'NOPAY' (ID 10)
            const toRemove = result.rows.find(r => r.name === 'NOPAY');
            const toKeep = result.rows.find(r => r.name === 'No Pay');

            if (toRemove && toKeep) {
                console.log(`\n🗑️  Removing: ${toRemove.name} (ID: ${toRemove.id})`);
                console.log(`✅ Keeping: ${toKeep.name} (ID: ${toKeep.id})`);

                // Update any employee_salary_structure records that reference the old one
                const updateRes = await client.query(
                    "UPDATE employee_salary_structure SET component_id = $1 WHERE component_id = $2",
                    [toKeep.id, toRemove.id]
                );
                console.log(`📝 Updated ${updateRes.rowCount} employee salary records to use '${toKeep.name}'`);

                // Delete the duplicate
                await client.query("DELETE FROM salary_components WHERE id = $1", [toRemove.id]);
                console.log(`✅ Deleted duplicate component`);
            }
        } else {
            console.log("No duplicates found.");
        }

        await client.query('COMMIT');
        console.log("\n--- Cleanup Complete ---");
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

removeDuplicateNoPay();
