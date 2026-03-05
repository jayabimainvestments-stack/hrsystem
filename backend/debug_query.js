const db = require('./config/db');

async function testAttendanceQuery() {
    const filterDate = '2026-02-15';
    console.log(`--- Testing Logistics Spectrum Query with Date: ${filterDate} ---`);

    let query = `
        SELECT * FROM (
            -- Physical Attendance Logs
            SELECT 
                a.id::text, a.employee_id, a.date::date, 
                a.clock_in::text, a.clock_out::text, 
                a.status, a.source, 
                e.designation, u.name as employee_name, e.department
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            
            UNION ALL
            
            -- Authorized Absence Spectrum (Approved Leaves)
            SELECT 
                l.id::text, e.id as employee_id, gs.date::date as date, 
                COALESCE(l.start_time::text, '--:--') as clock_in, 
                COALESCE(l.end_time::text, '--:--') as clock_out, 
                l.leave_type as status, 'Authorized Leave' as source,
                e.designation, u.name as employee_name, e.department
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            JOIN employees e ON e.user_id = u.id
            CROSS JOIN LATERAL generate_series(l.start_date::timestamp, l.end_date::timestamp, '1 day'::interval) gs(date)
            WHERE l.status = 'Approved'
            AND NOT EXISTS (
                SELECT 1 FROM attendance att 
                WHERE att.employee_id = e.id AND att.date = gs.date::date
            )
        ) spectrum
        WHERE 1=1
    `;
    const params = [];
    params.push(filterDate);
    query += ` AND spectrum.date = $${params.length}`;

    try {
        const result = await db.query(query, params);
        console.log('✅ Query Success! Rows found:', result.rows.length);
    } catch (error) {
        console.error('❌ Query Failed:', error);
    } finally {
        process.exit();
    }
}

testAttendanceQuery();
