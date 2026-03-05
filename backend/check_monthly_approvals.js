const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT * FROM performance_monthly_approvals WHERE month = '2026-02'");
        console.log('Feb Monthly Approvals:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
