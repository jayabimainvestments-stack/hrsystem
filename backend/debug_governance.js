const db = require('./config/db');

async function debug() {
    try {
        console.log('--- Testing genericChanges ---');
        const genericChanges = await db.query(`
            SELECT p.*, u.name as requester_name, 
                   CASE 
                     WHEN p.entity = 'attendance' THEN 'ATTENDANCE' 
                     ELSE 'SALARY' 
                   END as type,
                   COALESCE(tu.name, bank_u.name, att_u.name, emp_direct.name) as target_name
            FROM pending_changes p
            LEFT JOIN users u ON p.requested_by = u.id
            LEFT JOIN employees te ON (p.entity IN ('employee_salary_structure', 'salary_structures', 'employees')) 
                                   AND te.id::text = p.entity_id::text
            LEFT JOIN users tu ON te.user_id = tu.id
            LEFT JOIN users bank_u ON (p.entity = 'employee_bank_details' OR p.entity = 'users') 
                                   AND bank_u.id::text = p.entity_id::text
            LEFT JOIN attendance att ON p.entity = 'attendance' AND att.id::text = p.entity_id::text
            LEFT JOIN employees att_e ON att.employee_id = att_e.id
            LEFT JOIN users att_u ON att_e.user_id = att_u.id
            LEFT JOIN employees e_dir ON (p.entity NOT IN ('attendance', 'financial_requests')) 
                                     AND p.entity_id ~ '^[0-9]+$' 
                                     AND e_dir.id::text = p.entity_id
            LEFT JOIN users emp_direct ON e_dir.user_id = emp_direct.id
            WHERE p.status = 'Pending'
        `);
        console.log('genericChanges count:', genericChanges.rowCount);

        console.log('--- Testing leaveRequests ---');
        const leaveRequests = await db.query(`
            SELECT 
                l.id, 'LEAVE' as type, l.user_id as entity_id, l.leave_type as field_name,
                NULL as old_value,
                json_build_object('start_date', l.start_date, 'end_date', l.end_date, 'no_of_days', l.no_of_days, 'reason', l.reason, 'is_unpaid', l.is_unpaid) as new_value,
                l.user_id as requested_by, l.reason, l.status,
                u.name as requester_name, l.created_at as updated_at
            FROM leaves l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.status = 'Pending'
        `);
        console.log('leaveRequests count:', leaveRequests.rowCount);

        console.log('--- Testing loanRequests ---');
        const loanRequests = await db.query(`
            SELECT 
                l.id, 'LOAN' as type, l.employee_id as entity_id, 'LOAN_APPLICATION' as field_name,
                NULL as old_value,
                json_build_object('total_amount', l.total_amount, 'num_installments', l.num_installments, 'installment_amount', l.installment_amount) as new_value,
                u.id as requested_by, NULL as reason, l.status,
                u.name as requester_name, l.created_at as updated_at
            FROM employee_loans l
            JOIN employees e ON l.employee_id = e.id
            LEFT JOIN users u ON e.user_id = u.id
            WHERE l.status = 'Pending'
        `);
        console.log('loanRequests count:', loanRequests.rowCount);

        console.log('--- Testing financialRequests ---');
        const financialRequests = await db.query(`
            SELECT 
                f.id, 'FINANCIAL' as type, f.data as new_value, f.requested_by, f.created_at as updated_at,
                u.name as requester_name, f.status, f.type as field_name, f.month,
                (
                    SELECT eu.name 
                    FROM employees ee 
                    JOIN users eu ON ee.user_id = eu.id 
                    WHERE ee.id = (f.data->0->>'employee_id')::int
                    LIMIT 1
                ) as target_name
            FROM financial_requests f
            LEFT JOIN users u ON f.requested_by = u.id
            WHERE f.status = 'Pending'
        `);
        console.log('financialRequests count:', financialRequests.rowCount);

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
            LEFT JOIN users u ON e.user_id = u.id
            WHERE r.status = 'Pending'
        `);
        console.log('resignationRequests count:', resignationRequests.rowCount);

        process.exit(0);
    } catch (err) {
        console.error('DIAGNOSTIC FAILED:', err);
        process.exit(1);
    }
}

debug();
