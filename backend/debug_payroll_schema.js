const db = require('./config/db');

async function debugSchema() {
    try {
        const columns = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'payroll'"
        );
        console.log('Columns in payroll table:');
        columns.rows.forEach(c => console.log(`- ${c.column_name}`));

        const sample = await db.query("SELECT * FROM payroll LIMIT 1");
        console.log('\nSample record:', sample.rows[0]);

        const count = await db.query("SELECT month, COUNT(*) FROM payroll GROUP BY month");
        console.log('\nPayroll count by month:');
        count.rows.forEach(r => console.log(`- Month: ${r.month}, Count: ${r.count}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugSchema();
