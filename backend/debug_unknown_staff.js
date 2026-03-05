const db = require('./config/db');

async function debugUnknownStaff() {
    try {
        console.log('\n=== DEBUGGING UNKNOWN STAFF IN LEAVES ===\n');

        // Fetch the problematic leaves (created recently, showing Unknown Staff)
        const result = await db.query(`
            SELECT 
                l.id,
                l.user_id,
                l.leave_type,
                l.start_date,
                l.created_at,
                u.id as user_table_id,
                u.name as user_name,
                u.email as user_email
            FROM leaves l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 5
        `);

        if (result.rows.length === 0) {
            console.log('No leaves found.');
        } else {
            console.log(`Found ${result.rows.length} recent leaves:\n`);
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}. Leave ID: ${row.id}`);
                console.log(`   Leave Type: ${row.leave_type}`);
                console.log(`   Dates: ${row.start_date}`);
                console.log(`   User ID in Leave: ${row.user_id}`);
                console.log(`   User Found in DB: ${row.user_table_id ? 'YES' : 'NO'}`);
                console.log(`   User Name: ${row.user_name || 'NULL'}`);
                console.log(`   User Email: ${row.user_email || 'NULL'}`);
                console.log('-----------------------------------');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugUnknownStaff();
