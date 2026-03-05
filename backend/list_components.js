const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function list() {
    try {
        const res = await pool.query("SELECT id, name, status FROM salary_components ORDER BY id");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

list();
