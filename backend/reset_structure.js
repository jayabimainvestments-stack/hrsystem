const db = require('./config/db');
const fs = require('fs');

async function resetStructures() {
    try {
        console.log("--- Resetting Employee Salary Structures ---");

        // 1. Backup
        const res = await db.query("SELECT * FROM employee_salary_structure");
        fs.writeFileSync('salary_structure_backup.json', JSON.stringify(res.rows, null, 2));
        console.log(`✅ Backup saved to salary_structure_backup.json (${res.rows.length} records)`);

        // 2. Truncate
        await db.query("TRUNCATE TABLE employee_salary_structure RESTART IDENTITY");
        console.log("✅ Table 'employee_salary_structure' has been truncated/reset.");

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

resetStructures();
