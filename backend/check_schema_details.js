const db = require('./config/db');

async function checkAttendanceSchema() {
    try {
        console.log('Checking Attendance Table Schema...');
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'attendance'
        `);
        console.table(res.rows);

        console.log('Checking Payroll Details Table Schema...');
        const res2 = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payroll_details'
        `);
        console.table(res2.rows);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAttendanceSchema();
