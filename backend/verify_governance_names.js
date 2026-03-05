const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: '123456',
    port: 5432,
});

async function verify() {
    try {
        console.log('--- Verifying Loan Requests Query ---');
        const loanRes = await pool.query(`
            SELECT 
                l.id, ru.name as requester_name, tu.name as target_name
            FROM employee_loans l
            JOIN employees e ON l.employee_id = e.id
            JOIN users tu ON e.user_id = tu.id
            LEFT JOIN users ru ON l.requested_by = ru.id
            WHERE l.status = 'Pending'
        `);
        console.log('Loan Results:', JSON.stringify(loanRes.rows, null, 2));

        console.log('\n--- Verifying Generic Pending Changes Query ---');
        const genericRes = await pool.query(`
            SELECT p.id, u.name as requester_name, 
                   COALESCE(tu.name, bank_u.name, att_u.name, emp_direct.name) as target_name
            FROM pending_changes p
            LEFT JOIN users u ON p.requested_by = u.id
            LEFT JOIN employees te ON (p.entity IN ('employee_salary_structure', 'salary_structures', 'employees')) AND te.id::text = p.entity_id
            LEFT JOIN users tu ON te.user_id = tu.id
            LEFT JOIN users bank_u ON (p.entity = 'employee_bank_details' OR p.entity = 'users') AND bank_u.id::text = p.entity_id
            LEFT JOIN attendance att ON p.entity = 'attendance' AND att.id::text = p.entity_id
            LEFT JOIN employees att_e ON att.employee_id = att_e.id
            LEFT JOIN users att_u ON att_e.user_id = att_u.id
            LEFT JOIN employees e_dir ON (p.entity NOT IN ('attendance', 'financial_requests')) AND p.entity_id ~ '^[0-9]+$' AND e_dir.id::text = p.entity_id
            LEFT JOIN users emp_direct ON e_dir.user_id = emp_direct.id
            WHERE p.status = 'Pending'
        `);
        console.log('Generic Results:', JSON.stringify(genericRes.rows, null, 2));

    } catch (e) {
        console.error('Verification Error:', e);
    } finally {
        await pool.end();
    }
}

verify();
