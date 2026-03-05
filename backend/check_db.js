const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log('Users Columns:', tableInfo.rows);

        const empStatusRes = await pool.query("SELECT employment_status, count(*) FROM employees GROUP BY employment_status");
        console.log('Employment Statuses:', empStatusRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
