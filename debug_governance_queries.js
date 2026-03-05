
const db = require('./backend/config/db');

async function testGovernanceQueries() {
    try {
        console.log('--- Testing genericChanges ---');
        const genericChanges = await db.query(`
            SELECT p.*, u.name as requester_name, 
                   CASE 
                     WHEN p.entity = 'attendance' THEN 'ATTENDANCE' 
                     ELSE 'SALARY' 
                   END as type
            FROM pending_changes p
            JOIN users u ON p.requested_by = u.id
            WHERE p.status = 'Pending'
        `);
        console.log('Success: ', genericChanges.rows.length);

        console.log('--- Testing leaveRequests ---');
        const leaveRequests = await db.query(`
            SELECT 
                l.id, 'LEAVE' as type, l.user_id as entity_id, l.leave_type as field_name,
                NULL as old_value,
                json_build_object('start_date', l.start_date, 'end_date', l.end_date, 'no_of_days', l.no_of_days, 'reason', l.reason, 'is_unpaid', l.is_unpaid) as new_value,
                l.user_id as requested_by, l.reason, l.status,
                u.name as requester_name, l.created_at as updated_at
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'Pending'
        `);
        console.log('Success: ', leaveRequests.rows.length);

        console.log('--- Testing loanRequests ---');
        const loanRequests = await db.query(`
            SELECT 
                l.id, 'LOAN' as type, l.employee_id as entity_id, 'LOAN_APPLICATION' as field_name,
                NULL as old_value,
                json_build_object('total_amount', l.total_amount, 'num_installments', l.num_installments, 'installment_amount', l.installment_amount) as new_value,
                u.id as requested_by, l.loan_date as reason, l.status,
                u.name as requester_name, l.created_at as updated_at
            FROM employee_loans l
            JOIN employees e ON l.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE l.status = 'Pending'
        `);
        console.log('Success: ', loanRequests.rows.length);

        console.log('--- Testing financialRequests ---');
        const financialRequests = await db.query(`
            SELECT 
                f.id, 'FINANCIAL' as type, f.data as new_value, f.requested_by, f.created_at as updated_at,
                u.name as requester_name, f.status, f.type as field_name
            FROM financial_requests f
            JOIN users u ON f.requested_by = u.id
            WHERE f.status = 'Pending'
        `);
        console.log('Success: ', financialRequests.rows.length);

        console.log('--- Testing resignationRequests ---');
        const resignationRequests = await db.query(`
            SELECT 
                r.id, 'RESIGNATION' as type, r.employee_id as entity_id, 'RESIGNATION_NOTICE' as field_name,
                NULL as old_value,
                json_build_object('reason', r.reason, 'notice_date', r.submitted_date, 'last_working_day', r.desired_last_day) as new_value,
                u.id as requested_by, r.reason, r.status,
                u.name as requester_name, r.created_at as updated_at
            FROM resignations r
            JOIN employees e ON r.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE r.status = 'Pending'
        `);
        console.log('Success: ', resignationRequests.rows.length);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        process.exit(0);
    }
}

testGovernanceQueries();
