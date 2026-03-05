const fs = require('fs');
const path = require('path');

// 1. Read the schema file (handle encoding if possible, but standard node fs usually handles utf8)
// On Windows, the redirection might have created UTF-16LE. Let's try reading as utf-8 first.
try {
    const minBuffer = fs.readFileSync('db_schema.json');
    // If it starts with BOM (0xFF 0xFE), it is UTF-16LE
    let content;
    if (minBuffer[0] === 0xFF && minBuffer[1] === 0xFE) {
        content = minBuffer.toString('utf16le');
    } else {
        content = minBuffer.toString('utf8');
    }

    // 2. Parse the schema
    const jsonStart = content.indexOf('{');
    if (jsonStart === -1) throw new Error('No JSON found');
    const jsonContent = content.substring(jsonStart);
    const schema = JSON.parse(jsonContent);

    // 3. Define Expected Schema
    const expected = {
        'payroll': ['user_id', 'month', 'basic_salary', 'deductions', 'bonuses', 'epf_employee', 'epf_employer', 'etf_employer', 'welfare', 'welfare_status', 'statutory_status'],
        'payroll_liabilities': ['month', 'type', 'total_payable', 'status', 'paid_amount', 'payment_ref', 'payment_date', 'payment_method', 'notes'],
        'employee_history': ['employee_id', 'action_type', 'previous_department', 'new_department', 'previous_designation', 'new_designation', 'previous_salary', 'new_salary', 'reason', 'changed_by'],
        'audit_logs': ['user_id', 'action', 'entity', 'entity_id', 'new_values'],
        'employee_loans': ['installments_paid', 'status', 'updated_at'],
        'employees': ['is_epf_eligible', 'is_etf_eligible', 'biometric_id'],
        'financial_requests': ['status', 'approved_by', 'month', 'type', 'data', 'requested_by'],
        'pending_changes': ['rejection_reason', 'approved_by']
    };

    // 4. Compare
    const missing = {};

    for (const [table, columns] of Object.entries(expected)) {
        if (!schema[table]) {
            missing[table] = 'TABLE MISSING';
        } else {
            const missingCols = columns.filter(col => !schema[table].includes(col));
            if (missingCols.length > 0) {
                missing[table] = missingCols;
            }
        }
    }

    console.log('--- MISSING SCHEMA ELEMENTS ---');
    console.log(JSON.stringify(missing, null, 2));

} catch (error) {
    console.error('Error reading/parsing schema:', error);
}
