const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Renaming Welfare to Welfare 2% in details ---');
        const res = await pool.query("UPDATE payroll_details SET component_name = 'Welfare 2%' WHERE component_name = 'Welfare'");
        console.log(`Updated ${res.rowCount} records.`);

        console.log('\n--- Final Verification ---');
        const check = await pool.query(`
            SELECT component_name, SUM(CAST(amount AS NUMERIC)) as total 
            FROM payroll_details pd 
            JOIN payroll p ON pd.payroll_id = p.id 
            WHERE p.month = '2026-02' 
            AND pd.component_name ILIKE '%Welfare%' 
            GROUP BY component_name
        `);
        console.log(check.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
