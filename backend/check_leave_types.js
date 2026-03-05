const db = require('./config/db');

async function checkLeaveTypes() {
    try {
        console.log('--- LEAVE TYPES ---');
        const res = await db.query("SELECT * FROM leave_types");
        console.table(res.rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLeaveTypes();
