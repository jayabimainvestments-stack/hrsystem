const db = require('./backend/config/db');
async function check() {
    try {
        const res = await db.query("SELECT * FROM attendance WHERE late_minutes > 0 AND status = 'Present'");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
