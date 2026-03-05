const db = require('./config/db');

async function clearHistory() {
    try {
        const result = await db.query(
            `DELETE FROM financial_requests WHERE type IN ('Fuel Allowance', 'Salary Advance')`
        );
        console.log(`✅ Deleted ${result.rowCount} records from financial_requests (Fuel Allowance + Salary Advance).`);
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    }
}

clearHistory();
