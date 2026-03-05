const db = require('./config/db');

async function testGetAllLeaves() {
    try {
        const result = await db.query(`
            SELECT l.*, 
                   u.name,
                   u.name as employee_name, 
                   u.email,
                   approver.name as approved_by_name
            FROM leaves l 
            JOIN users u ON l.user_id = u.id 
            LEFT JOIN users approver ON l.approved_by = approver.id
            ORDER BY l.created_at DESC
            LIMIT 1
        `);

        console.log('=== GET ALL LEAVES RESULT (First Row) ===');
        const row = result.rows[0];
        console.log('Keys:', Object.keys(row));
        console.log('row.name:', row.name);
        console.log('row.employee_name:', row.employee_name);
        console.log('Full Row:', JSON.stringify(row, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testGetAllLeaves();
