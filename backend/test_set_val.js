const db = require('./config/db');

async function run() {
    try {
        const res = await db.query("UPDATE attendance_policies SET absent_day_amount = 999 RETURNING *;");
        console.log('Updated Record:');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
