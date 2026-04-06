const db = require('./backend/config/db');

async function checkData() {
    try {
        console.log('--- Checking company_holidays schema ---');
        const schemaRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'company_holidays'
        `);
        console.log(schemaRes.rows);

        console.log('\n--- Checking company_holidays data ---');
        const holidayRes = await db.query("SELECT id, date, name, type FROM company_holidays WHERE date::text LIKE '2026-04-01%'");
        console.log(holidayRes.rows);

        console.log('\n--- Checking attendance counts for 2026-04-01 ---');
        const attendanceRes = await db.query("SELECT status, COUNT(*) FROM attendance WHERE date = '2026-04-01' GROUP BY status");
        console.log(attendanceRes.rows);

        console.log('\n--- Checking a few attendance records for 2026-04-01 ---');
        const sampleRes = await db.query("SELECT id, employee_id, status, source FROM attendance WHERE date = '2026-04-01' LIMIT 5");
        console.log(sampleRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
