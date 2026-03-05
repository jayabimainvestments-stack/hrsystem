const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'salary_components' AND column_name = 'status'");
        console.log('Status Column Info:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
