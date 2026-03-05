const db = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const res = await db.query("SELECT id, name, status, status = 'Active' as is_active_cap, status = 'active' as is_active_low FROM salary_components WHERE name ILIKE '%performance%'");
        console.log('Performance Components Detail:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
