const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, name FROM salary_components WHERE name ILIKE ANY(ARRAY['%Fuel%', '%Performance%', '%Attendance%', '%Loan%'])")
    .then(r => { console.log(r.rows); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
