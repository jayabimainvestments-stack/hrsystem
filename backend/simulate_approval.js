const db = require('./config/db');
require('dotenv').config();

async function simulate() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const month = '2026-02';
        const userId = 36; // Admin

        console.log('--- Simulating Performance Approval ---');

        // Check if Monthly Performance component exists
        const perfComponentRes = await client.query(`
            SELECT id, name, status FROM salary_components 
            WHERE LOWER(name) LIKE '%performance%' AND status ILIKE 'active'
            ORDER BY CASE WHEN LOWER(name) LIKE '%monthly%' THEN 0 ELSE 1 END, name
            LIMIT 1
        `);
        console.log('Perf Component Found:', perfComponentRes.rows);

        if (perfComponentRes.rows.length === 0) {
            console.log('ERROR: No component found with status=Active');
            // Try with status=active
            const altRes = await client.query(`
                SELECT id, name, status FROM salary_components 
                WHERE LOWER(name) LIKE '%performance%' AND (status = 'Active' OR status = 'active')
                ORDER BY CASE WHEN LOWER(name) LIKE '%monthly%' THEN 0 ELSE 1 END, name
                LIMIT 1
            `);
            console.log('Alternative (case-insensitive) Component Found:', altRes.rows);
        }

        // Check if there are employees with pending performance
        const employeesRes = await client.query(`
            SELECT e.id, u.name
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);
        console.log('Active Employees:', employeesRes.rows.length);

        const pointValueRes = await client.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);
        console.log('Point Value:', pointValue);

        await client.query('ROLLBACK');
        process.exit(0);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
    }
}
simulate();
