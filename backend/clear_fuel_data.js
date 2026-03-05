const db = require('./config/db');
async function clear() {
    const r = await db.query("DELETE FROM financial_requests WHERE type = 'Fuel Allowance' RETURNING id");
    console.log(`✅ Deleted ${r.rowCount} old Fuel Allowance requests`);
    process.exit(0);
}
clear().catch(e => { console.error(e.message); process.exit(1); });
