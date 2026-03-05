const db = require('./config/db');
const fs = require('fs');

async function restoreStructures() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- Restoring Employee Salary Structures ---");

        // 1. Read Backup
        const backupData = JSON.parse(fs.readFileSync('salary_structure_backup.json', 'utf8'));
        console.log(`📂 Read ${backupData.length} records from backup.`);

        // 2. Clear Existing (Just in case)
        await client.query("DELETE FROM employee_salary_structure");

        // 3. Insert Data
        for (const item of backupData) {
            await client.query(
                `INSERT INTO employee_salary_structure 
                (id, employee_id, component_id, amount, effective_date, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [item.id, item.employee_id, item.component_id, item.amount, item.effective_date, item.created_at]
            );
        }

        // 4. Reset Sequence
        const maxIdRes = await client.query("SELECT MAX(id) as max_id FROM employee_salary_structure");
        const maxId = maxIdRes.rows[0].max_id || 0;
        await client.query(`SELECT setval('employee_salary_structure_id_seq', $1)`, [maxId]);

        await client.query('COMMIT');
        console.log("✅ Data successfully restored!");
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Restore failed:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

restoreStructures();
