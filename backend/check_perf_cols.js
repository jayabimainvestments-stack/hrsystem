const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='performance_appraisals'")
    .then(r => { console.log(r.rows.map(x => x.column_name)); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
