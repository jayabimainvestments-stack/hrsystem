const db = require('./config/db');

async function run() {
    try {
        const columns = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance_policies';");
        console.log('Columns:');
        console.table(columns.rows);

        const data = await db.query("SELECT * FROM attendance_policies;");
        console.log('\nData:');
        console.table(data.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
