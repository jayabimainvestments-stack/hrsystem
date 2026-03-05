const db = require('./config/db');

async function checkRequests() {
    try {
        const empRes = await db.query(`
            SELECT e.id FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Lahiru%' AND u.name ILIKE '%Nishshanka%'
        `);
        if (empRes.rows.length === 0) {
            console.log('Employee not found');
            process.exit(0);
        }
        const empId = empRes.rows[0].id;

        console.log(`Checking requests for Employee ID: ${empId}`);

        // 1. Check Financial Requests
        const finRes = await db.query(`
            SELECT id, month, type, status, created_at 
            FROM financial_requests 
            WHERE data::text LIKE '%"employee_id":' || $1 || ',%'
               OR data::text LIKE '%"employee_id": ' || $1 || ',%'
        `, [empId]);
        console.log('\n--- Financial Requests ---');
        console.table(finRes.rows);

        // 2. Check Attendance Deductions
        const attRes = await db.query(`
            SELECT id, month, total_amount, status, reason 
            FROM attendance_deductions 
            WHERE employee_id = $1
        `, [empId]);
        console.log('\n--- Attendance Deductions ---');
        console.table(attRes.rows);

        // 3. Check Loans
        const loanRes = await db.query(`
            SELECT id, total_amount, status, installments_paid, num_installments 
            FROM employee_loans 
            WHERE employee_id = $1
        `, [empId]);
        console.log('\n--- Loans ---');
        console.table(loanRes.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkRequests();
