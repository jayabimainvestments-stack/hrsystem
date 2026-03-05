const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT e.id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = 28");
        console.log('Employee 28:', res.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
