const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, name FROM salary_components ORDER BY id")
    .then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
