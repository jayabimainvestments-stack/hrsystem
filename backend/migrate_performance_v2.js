const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function migrate() {
    try {
        console.log('--- Starting Migration: performance_weekly_data ---');

        // 1. Add columns if they don't exist
        await pool.query(`
            ALTER TABLE performance_weekly_data 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending',
            ADD COLUMN IF NOT EXISTS payroll_month VARCHAR(7)
        `);
        console.log('Columns added (if not existed).');

        // 2. Ensure existing data is set to 'Pending'
        await pool.query(`
            UPDATE performance_weekly_data 
            SET status = 'Pending' 
            WHERE status IS NULL
        `);
        console.log('Existing records updated to Pending.');

        // 3. Optional: Add an index for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_perf_weekly_status_pmonth 
            ON performance_weekly_data (status, payroll_month)
        `);
        console.log('Index created.');

        console.log('--- Migration Completed Successfully ---');
    } catch (e) {
        console.error('Migration Failed:', e);
    } finally {
        await pool.end();
    }
}
migrate();
