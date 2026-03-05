const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT * FROM performance_weekly_data");
        console.log('Current Weekly Data:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
