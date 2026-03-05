const db = require('./config/db');

async function runAudit() {
    try {
        const month = '2026-02';
        console.log(`--- Attendance & Leave Audit for ${month} ---`);

        const attRes = await db.query(`
            SELECT u.name, 
                   COUNT(*) FILTER (WHERE LOWER(a.status) = 'absent') as absent_count, 
                   COALESCE(SUM(a.late_minutes), 0) as late_mins, 
                   COALESCE(SUM(a.overtime_hours), 0) as ot_hours 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.id 
            JOIN users u ON e.user_id = u.id 
            WHERE a.date::text LIKE $1 
            GROUP BY u.name
        `, [month + '%']);
        console.log('Attendance Stats:', JSON.stringify(attRes.rows, null, 2));

        const leaveRes = await db.query(`
            SELECT u.name, COALESCE(SUM(unpaid_days), 0) as unpaid_days 
            FROM leaves l 
            JOIN users u ON l.user_id = u.id 
            WHERE l.status = 'Approved' 
            AND (l.start_date::text LIKE $1 OR l.end_date::text LIKE $1) 
            GROUP BY u.name
        `, [month + '%']);
        console.log('Leave Stats (Unpaid):', JSON.stringify(leaveRes.rows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAudit();
