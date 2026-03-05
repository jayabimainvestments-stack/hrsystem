const db = require('./config/db');

async function cleanupWeekendAbsences() {
    try {
        console.log('\n=== CLEANING UP WEEKEND ABSENCES ===\n');

        // Find weekend records marked as Absent
        const findResult = await db.query(`
            SELECT 
                a.id,
                a.date,
                a.status,
                a.source,
                to_char(a.date, 'Day') as day_name,
                u.name as employee_name
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE trim(to_char(a.date, 'Day')) IN ('Saturday', 'Sunday')
            AND a.status = 'Absent'
            ORDER BY a.date DESC
        `);

        if (findResult.rows.length === 0) {
            console.log('✅ No weekend absence records found!');
            process.exit(0);
        }

        console.log(`Found ${findResult.rows.length} weekend absence records:\n`);
        findResult.rows.forEach((record, index) => {
            console.log(`${index + 1}. ${record.employee_name}`);
            console.log(`   Date: ${record.date.toISOString().split('T')[0]} (${record.day_name.trim()})`);
            console.log(`   Status: ${record.status}`);
            console.log(`   Source: ${record.source}`);
            console.log('');
        });

        // Delete them
        const deleteResult = await db.query(`
            DELETE FROM attendance
            WHERE trim(to_char(date, 'Day')) IN ('Saturday', 'Sunday')
            AND status = 'Absent'
        `);

        console.log(`✅ Deleted ${deleteResult.rowCount} weekend absence records!`);
        console.log('\nEmployees will no longer be marked absent on weekends.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanupWeekendAbsences();
