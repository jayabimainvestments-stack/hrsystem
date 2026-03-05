const db = require('./config/db');

async function testApprovedBy() {
    try {
        const result = await db.query(`
            SELECT l.id,
                   l.status,
                   l.approved_by,
                   u.name as employee_name, 
                   u.email,
                   approver.name as approved_by_name
            FROM leaves l 
            JOIN users u ON l.user_id = u.id 
            LEFT JOIN users approver ON l.approved_by = approver.id
            WHERE l.status = 'Approved'
            ORDER BY l.created_at DESC
            LIMIT 5
        `);

        console.log('\n=== APPROVED LEAVES TEST ===\n');
        console.log(`Found ${result.rows.length} approved leaves\n`);

        result.rows.forEach((leave, index) => {
            console.log(`${index + 1}. Leave ID: ${leave.id}`);
            console.log(`   Employee: ${leave.employee_name} (${leave.email})`);
            console.log(`   Approved By ID: ${leave.approved_by}`);
            console.log(`   Approved By Name: ${leave.approved_by_name || 'NOT FOUND - NULL'}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testApprovedBy();
