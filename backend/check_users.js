const db = require('./config/db');
async function check() {
    const res = await db.query("SELECT id, name, role FROM users LIMIT 10");
    console.log(res.rows);
    process.exit(0);
}
check();
