const db = require('./config/db');

async function debugLateMinutes() {
    try {
        const month = '2026-02';
        const query = `
            SELECT 
                a.employee_id, 
                u.name,
                COUNT(*) FILTER (WHERE a.status = 'Late') as late_count,
                SUM(COALESCE(a.late_minutes, 0)) as total_late_minutes
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE to_char(a.date, 'YYYY-MM') = $1
            GROUP BY a.employee_id, u.name
        `;
        const res = await db.query(query, [month]);
        console.table(res.rows);

        // Also check if any late minutes are actually > 0
        const rawRes = await db.query(`SELECT id, date, clock_in, late_minutes, status FROM attendance WHERE late_minutes > 0 AND to_char(date, 'YYYY-MM') = $1 LIMIT 5`, [month]);
        console.log("Sample records with late_minutes > 0:");
        console.table(rawRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

debugLateMinutes();
