const db = require('./config/db');
async function run() {
    try {
        const res = await db.query("SELECT name, type FROM salary_components WHERE name ILIKE '%performance%'");
        console.log('Component Types:', res.rows);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
run();
