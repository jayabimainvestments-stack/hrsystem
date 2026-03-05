const db = require('./config/db');

async function checkSchema() {
    const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employee_loans'`);
    console.log(res.rows.map(x => x.column_name).join(', '));
    process.exit(0);
}
checkSchema().catch(err => { console.error(err.message); process.exit(1); });
