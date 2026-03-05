const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkCols() {
    try {
        const tables = ['financial_requests', 'employee_loans', 'monthly_salary_overrides', 'pending_changes'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.log(`Columns for ${table}:`, res.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkCols();
