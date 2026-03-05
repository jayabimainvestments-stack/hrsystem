const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query('SELECT status, COUNT(*) FROM monthly_salary_overrides GROUP BY status');
        console.log('Override Statuses:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
