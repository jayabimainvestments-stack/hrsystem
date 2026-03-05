const db = require('./config/db');

async function cleanupOrphanedAbsences() {
    try {
        console.log('\n=== CLEANING UP ORPHANED ABSENCES ===\n');

        // Find all Absent records that should be deleted for approved leaves
        const findResult = await db.query(`
            SELECT 
                a.id as attendance_id,
                a.date,
                a.status,
                e.id as employee_id,
                u.name as employee_name,
                l.id as leave_id,
                l.leave_type,
                l.start_date,
                l.end_date
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN leaves l ON l.user_id = u.id
                AND a.date >= l.start_date::date
                AND a.date <= l.end_date::date
                AND l.status = 'Approved'
            WHERE a.status = 'Absent'
            ORDER BY a.date DESC
        `);

        if (findResult.rows.length === 0) {
            console.log('✅ No orphaned absence records found!');
            process.exit(0);
        }

        console.log(`Found ${findResult.rows.length} orphaned absence records:\n`);
        findResult.rows.forEach((record, index) => {
            console.log(`${index + 1}. ${record.employee_name}`);
            console.log(`   Date: ${record.date.toISOString().split('T')[0]}`);
            console.log(`   Leave: ${record.leave_type} (ID: ${record.leave_id})`);
            console.log(`   Attendance ID: ${record.attendance_id}`);
            console.log('');
        });

        // Delete the orphaned records
        const deleteResult = await db.query(`
            DELETE FROM attendance a
            USING employees e, users u, leaves l
            WHERE a.employee_id = e.id
                AND e.user_id = u.id
                AND l.user_id = u.id
                AND a.date >= l.start_date::date
                AND a.date <= l.end_date::date
                AND l.status = 'Approved'
                AND a.status = 'Absent'
        `);

        console.log(`✅ Deleted ${deleteResult.rowCount} orphaned absence records!`);
        console.log('\nThese absences will no longer appear in attendance reports.');
        console.log('Future leave approvals will automatically delete absences.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanupOrphanedAbsences();
