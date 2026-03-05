const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function check() {
    try {
        console.log('--- FEB 2026 DATA ---');
        const feb = await pool.query(`
            SELECT wd.*, u.name 
            FROM performance_weekly_data wd 
            JOIN employees e ON wd.employee_id = e.id 
            JOIN users u ON e.user_id = u.id 
            WHERE wd.week_starting >= '2026-02-01' 
            ORDER BY wd.week_starting DESC 
            LIMIT 50
        `);
        console.table(feb.rows);

        console.log('\n--- STATUS SUMMARY FOR FEB ---');
        const stats = await pool.query(`
            SELECT status, COUNT(*) 
            FROM performance_weekly_data 
            WHERE week_starting >= '2026-02-01' 
            GROUP BY status
        `);
        console.table(stats.rows);

        console.log('\n--- JANUARY DATA (FOR COMPARISON) ---');
        const jan = await pool.query(`
            SELECT wd.*, u.name 
            FROM performance_weekly_data wd 
            JOIN employees e ON wd.employee_id = e.id 
            JOIN users u ON e.user_id = u.id 
            WHERE wd.week_starting >= '2026-01-01' AND wd.week_starting < '2026-02-01'
            ORDER BY wd.week_starting DESC 
            LIMIT 50
        `);
        console.table(jan.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
