const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function find() {
    const res = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%loan%'");
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
}

find();
