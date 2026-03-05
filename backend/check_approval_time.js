const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT id, approved_at FROM performance_monthly_approvals");
        console.log('Approvals:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
