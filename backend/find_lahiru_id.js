const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT e.id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name ILIKE '%Lahiru%'")
    .then(r => { console.log(r.rows); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
