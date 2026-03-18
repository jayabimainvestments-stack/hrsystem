const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        console.log('--- Attendance Table Schema ---');
        const schema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'attendance' 
            ORDER BY ordinal_position
        `);
        console.table(schema.rows);

        console.log('\n--- Latest Records for Today ---');
        const records = await pool.query(`
            SELECT e.name, a.date, a.clock_in, a.clock_out, a.source
            FROM attendance a
            JOIN employees emp ON a.employee_id = emp.id
            JOIN users u ON emp.user_id = u.id
            WHERE a.date = CURRENT_DATE
            ORDER BY a.id DESC
            LIMIT 10
        `);
        console.table(records.rows);
    } finally {
        await pool.end();
    }
}
main();
