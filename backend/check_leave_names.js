const db = require('./config/db');

/**
 * Check leave records to see if employee names are included
 */

async function checkLeaveNames() {
    try {
        console.log("\n=== CHECKING LEAVE RECORDS ===\n");

        // Check how leaves are currently stored
        const leavesRes = await db.query(`
            SELECT l.id, l.user_id, l.leave_type, l.start_date, l.end_date, l.status,
                   u.name as user_name,
                   e.id as employee_id
            FROM leaves l
            LEFT JOIN users u ON l.user_id = u.id
            LEFT JOIN employees e ON e.user_id = l.user_id
            ORDER BY l.created_at DESC
            LIMIT 10
        `);

        console.log(`📋 Found ${leavesRes.rows.length} leave records:\n`);
        console.table(leavesRes.rows.map(r => ({
            id: r.id,
            user_name: r.user_name || '❌ MISSING',
            leave_type: r.leave_type,
            dates: `${r.start_date.toISOString().split('T')[0]} to ${r.end_date.toISOString().split('T')[0]}`,
            status: r.status
        })));

        const missingNames = leavesRes.rows.filter(r => !r.user_name);
        if (missingNames.length > 0) {
            console.log(`\n⚠️  ${missingNames.length} leave record(s) missing employee names`);
        } else {
            console.log("\n✅ All leave records have employee names");
        }

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkLeaveNames();
