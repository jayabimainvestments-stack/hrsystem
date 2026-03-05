const db = require('./config/db');

async function debugTables() {
    try {
        const empCols = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'"
        );
        console.log('Columns in employees table:');
        empCols.rows.forEach(c => console.log(`- ${c.column_name}`));

        const payRes = await db.query("SELECT * FROM payroll WHERE month = '2026-02'");
        console.log('\nPayroll Records for 2026-02:');
        payRes.rows.forEach(r => console.log(`ID: ${r.id}, user_id: ${r.user_id}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugTables();
