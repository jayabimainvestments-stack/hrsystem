const db = require('./backend/config/db');

async function approveLoan() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const id = 1;
        const action = 'Approve';
        const status = 'Approved';
        const approver_id = 18; // Using same user for now as requester, as segregation is disabled for loans in code

        // 1. Get Loan
        const loanRes = await client.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0) throw new Error('Loan record not found');
        const loan = loanRes.rows[0];

        // 2. Upsert into salary structure
        const checkStruct = await client.query(
            'SELECT 1 FROM employee_salary_structure WHERE employee_id = $1 AND component_id = 25',
            [loan.employee_id]
        );

        if (checkStruct.rows.length > 0) {
            await client.query(`
            UPDATE employee_salary_structure 
            SET amount = $1, installments_remaining = $2, is_locked = true, lock_reason = $3, updated_at = NOW()
            WHERE employee_id = $4 AND component_id = 25
        `, [loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`, loan.employee_id]);
        } else {
            await client.query(`
            INSERT INTO employee_salary_structure (employee_id, component_id, amount, installments_remaining, is_locked, lock_reason)
            VALUES ($1, 25, $2, $3, true, $4)
        `, [loan.employee_id, loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`]);
        }

        // 3. Update loan status
        await client.query(
            'UPDATE employee_loans SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3',
            [status, approver_id, id]
        );

        await client.query('COMMIT');
        console.log('Loan 1 approved successfully.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

approveLoan();
