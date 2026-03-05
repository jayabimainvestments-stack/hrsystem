const db = require('./config/db');

async function testQuery() {
    try {
        console.log('Testing Loan Fetch Query...');
        const query = `
            SELECT el.*, u.name as employee_name, 
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                   req.name as requester_name, app.name as approver_name
            FROM employee_loans el
            JOIN employees e ON el.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN users req ON el.requested_by = req.id
            LEFT JOIN users app ON el.approved_by = app.id
            ORDER BY el.created_at DESC
        `;
        const result = await db.query(query);
        console.log('Loans found:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('Sample Loan:', JSON.stringify(result.rows[0], null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error('QUERY FAILED:', error);
        process.exit(1);
    }
}

testQuery();
