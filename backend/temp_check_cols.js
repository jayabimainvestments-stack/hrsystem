const db = require('./config/db');
async function run() {
    const res = await db.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'monthly_salary_overrides'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
run();
