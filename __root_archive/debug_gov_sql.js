
const db = require('./backend/config/db');

async function debugGovernanceSQL() {
    try {
        console.log('--- Testing Enhanced genericChanges SQL ---');
        const query = `
            SELECT p.*, u.name as requester_name, 
                   CASE 
                     WHEN p.entity = 'attendance' THEN 'ATTENDANCE' 
                     ELSE 'SALARY' 
                   END as type,
                   COALESCE(tu.name, att_u.name, bank_u.name) as target_name
            FROM pending_changes p
            LEFT JOIN users u ON p.requested_by = u.id
            -- Link to target employee (Salary/General)
            LEFT JOIN employees te ON (p.entity IN ('employee_salary_structure', 'salary_structures', 'employees')) AND te.id = p.entity_id
            LEFT JOIN users tu ON te.user_id = tu.id
            -- Link to target employee (Attendance)
            LEFT JOIN attendance att ON p.entity = 'attendance' AND att.id = p.entity_id
            LEFT JOIN employees att_e ON att.employee_id = att_e.id
            LEFT JOIN users att_u ON att_e.user_id = att_u.id
            -- Link to target user (Bank Details)
            LEFT JOIN users bank_u ON p.entity = 'employee_bank_details' AND bank_u.id = p.entity_id
            WHERE p.status = 'Pending'
        `;
        const result = await db.query(query);
        console.log('Success! Count:', result.rows.length);
        console.log('Sample Row:', JSON.stringify(result.rows[0], null, 2));
    } catch (err) {
        console.error('SQL ERROR:', err);
    } finally {
        process.exit(0);
    }
}

debugGovernanceSQL();
