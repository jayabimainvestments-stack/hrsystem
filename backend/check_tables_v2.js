const db = require('./config/db');

(async () => {
    try {
        console.log('--- EMPLOYEES SCHMEMA ---');
        const r1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position");
        console.table(r1.rows);

        console.log('\n--- SALARY COMPONENTS ---');
        const r2 = await db.query("SELECT * FROM salary_components");
        console.table(r2.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
