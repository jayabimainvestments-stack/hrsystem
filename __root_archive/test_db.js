const db = require('./backend/config/db');
require('dotenv').config();

async function check() {
    try {
        const types = await db.query('SELECT * FROM leave_types');
        console.log('Leave Types:', types.rows);
        const leaves = await db.query('SELECT * FROM leaves LIMIT 1');
        console.log('Sample Leave:', leaves.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
