const db = require('./config/db');

async function check() {
    // 1. Check pending_changes for salary structure entries
    const pc = await db.query(`SELECT id, entity, entity_id, field_name, status, new_value FROM pending_changes WHERE entity = 'employee_salary_structure' LIMIT 5`);
    console.log('--- Salary Structure Pending Changes ---');
    console.log(JSON.stringify(pc.rows, null, 2));

    // 2. Check if there are any SALARY type changes at all
    const all = await db.query(`SELECT id, entity, entity_id, field_name, status, updated_at FROM pending_changes ORDER BY updated_at DESC LIMIT 10`);
    console.log('\n--- Recent Pending Changes ---');
    console.log(JSON.stringify(all.rows, null, 2));

    process.exit(0);
}

check().catch(err => { console.error(err.message); process.exit(1); });
