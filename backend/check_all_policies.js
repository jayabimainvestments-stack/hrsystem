const db = require('./config/db');

async function run() {
    try {
        const data = await db.query("SELECT * FROM attendance_policies;");
        console.log('Total Records:', data.rowCount);
        console.table(data.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
