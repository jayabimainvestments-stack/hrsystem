const db = require('./config/db');
async function check() {
    try {
        const res = await db.query("SELECT mo.*, sc.name FROM monthly_salary_overrides mo JOIN salary_components sc ON mo.component_id = sc.id WHERE mo.month = '2026-02'");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
