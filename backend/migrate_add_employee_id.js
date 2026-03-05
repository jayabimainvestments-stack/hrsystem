require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

async function migrate() {
    try {
        console.log("Checking for employee_id column...");
        const check = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'employee_id'");

        if (check.rows.length === 0) {
            console.log("Adding employee_id column...");
            await db.query("ALTER TABLE employees ADD COLUMN employee_id VARCHAR(50)");
            console.log("Column added.");
        } else {
            console.log("Column already exists.");
        }

        // Update existing rows with dummy IDs if null
        await db.query("UPDATE employees SET employee_id = 'EMP' || id WHERE employee_id IS NULL");
        console.log("Updated null employee_ids.");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
