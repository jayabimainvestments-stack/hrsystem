const db = require('./config/db');

async function checkIndexes() {
    try {
        const res = await db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'payroll'");
        console.log('Indexes for payroll table:');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error checking indexes:', err);
        process.exit(1);
    }
}

checkIndexes();
