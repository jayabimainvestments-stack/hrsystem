const db = require('./config/db');
async function check() {
    const r1 = await db.query('SELECT * FROM attendance_policies LIMIT 1');
    console.log('attendance_policies:', JSON.stringify(r1.rows, null, 2));
    process.exit(0);
}
check();
