const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function findTable() {
    try {
        console.log('Searching for any table containing "deduction"...');
        const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%deduction%'");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\nChecking columns for attendance_deductions in all schemas...');
        const colRes = await pool.query("SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE table_name = 'attendance_deductions'");
        console.log(JSON.stringify(colRes.rows, null, 2));

    } catch (err) {
        console.error('SEARCH ERROR:', err);
    } finally {
        await pool.end();
    }
}

findTable();
