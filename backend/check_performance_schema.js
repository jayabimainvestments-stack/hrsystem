const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        console.log('--- performance_weekly_data ---');
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'performance_weekly_data'");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- performance_monthly_approvals ---');
        const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'performance_monthly_approvals'");
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
