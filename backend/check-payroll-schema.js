const db = require('./config/db');

async function checkColumns() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payroll'");
        console.log(res.rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkColumns();
