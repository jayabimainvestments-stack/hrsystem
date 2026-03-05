require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM employees LIMIT 1");
        if (res.rows.length > 0) {
            console.log("Columns:", Object.keys(res.rows[0]));
        } else {
            console.log("Table empty, checking information_schema...");
            const schema = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
            console.log("Schema Columns:", schema.rows.map(r => r.column_name));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
