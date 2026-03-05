const db = require('./config/db');

async function replayApproved() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Get all valid component IDs
        const validComps = await client.query('SELECT id FROM salary_components');
        const validIds = new Set(validComps.rows.map(r => r.id));
        console.log(`Valid component IDs: ${[...validIds].join(', ')}`);

        const changes = await client.query(`
            SELECT id, entity_id, new_value 
            FROM pending_changes 
            WHERE entity = 'employee_salary_structure' 
              AND field_name = 'MULTIPLE_COMPONENTS' 
              AND status = 'Approved'
            ORDER BY id ASC
        `);

        console.log(`\nFound ${changes.rows.length} approved changes to replay\n`);

        for (const change of changes.rows) {
            const employeeId = change.entity_id;
            const updates = JSON.parse(change.new_value);

            console.log(`Replaying change ID ${change.id} for employee ${employeeId}:`);

            for (const update of updates) {
                // Skip if component no longer exists
                if (!validIds.has(update.component_id)) {
                    console.log(`  ⚠️  SKIPPED component ${update.component_id} — no longer exists in salary_components`);
                    continue;
                }

                const existing = await client.query(
                    'SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [employeeId, update.component_id]
                );

                if (existing.rows.length > 0) {
                    await client.query(
                        'UPDATE employee_salary_structure SET amount = $1, quantity = $2, installments_remaining = $3 WHERE employee_id = $4 AND component_id = $5',
                        [update.amount, update.quantity, update.installments_remaining, employeeId, update.component_id]
                    );
                    console.log(`  ✅ UPDATED component ${update.component_id} → amount=${update.amount}, qty=${update.quantity}`);
                } else {
                    await client.query(
                        'INSERT INTO employee_salary_structure (employee_id, component_id, amount, quantity, installments_remaining) VALUES ($1, $2, $3, $4, $5)',
                        [employeeId, update.component_id, update.amount, update.quantity, update.installments_remaining]
                    );
                    console.log(`  ✅ INSERTED component ${update.component_id} → amount=${update.amount}, qty=${update.quantity}`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Replay committed successfully');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ ERROR:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

replayApproved();
