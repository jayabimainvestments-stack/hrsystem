const db = require('./config/db');
async function clear() {
    // Clear loan installments first (child records)
    const r1 = await db.query("DELETE FROM loan_installments RETURNING id");
    console.log(`✅ Deleted ${r1.rowCount} loan installment records`);

    // Clear loan records
    const r2 = await db.query("DELETE FROM employee_loans RETURNING id");
    console.log(`✅ Deleted ${r2.rowCount} loan records`);

    process.exit(0);
}
clear().catch(e => { console.error(e.message); process.exit(1); });
