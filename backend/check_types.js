const db = require('./config/db');
async function run() {
    try {
        const types = await db.query('SELECT * FROM leave_types');
        console.log('--- LEAVE TYPES ---');
        console.log(JSON.stringify(types.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
