const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        const res = await pool.query("SELECT id, month, type, status, created_at FROM financial_requests ORDER BY created_at DESC");
        console.log('Requests:', JSON.stringify(res.rows, null, 2));
    } finally {
        await pool.end();
    }
}
check();
