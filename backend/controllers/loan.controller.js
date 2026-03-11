const db = require('../config/db');

// @desc    Submit a new loan application
// @route   POST /api/loans
// @access  Private (Admin/HR)
const submitLoan = async (req, res) => {
    const {
        employee_id,
        loan_date,
        total_amount,
        installment_amount,
        num_installments,
        start_date,
        end_date,
        reason
    } = req.body;

    if (!employee_id || !loan_date || !total_amount || !installment_amount || !num_installments || !start_date || !end_date) {
        return res.status(400).json({ message: 'All loan fields are required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO employee_loans 
            (employee_id, loan_date, total_amount, installment_amount, num_installments, start_date, end_date, requested_by, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
             RETURNING *`,
            [employee_id, loan_date, total_amount, installment_amount, num_installments, start_date, end_date, req.user.id, reason]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all loans
// @route   GET /api/loans
// @access  Private (Admin/HR)
const getLoans = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT el.*, u.name as employee_name, 
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                   req.name as requester_name, app.name as approver_name
            FROM employee_loans el
            JOIN employees e ON el.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN users req ON el.requested_by = req.id
            LEFT JOIN users app ON el.approved_by = app.id
            ORDER BY el.created_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a loan request
// @route   POST /api/loans/:id/approve
// @access  Private (Admin/HR Manager)
const approveLoan = async (req, res) => {
    const { id } = req.params;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Loan
        const loanRes = await client.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Loan request not found' });
        }

        const loan = loanRes.rows[0];
        if (loan.status !== 'Pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Loan is already processed.' });
        }

        // Segregation of Duties: Requester cannot be Approver
        if (String(loan.requested_by) === String(req.user.id)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Segregation of duties: You cannot approve your own loan request.' });
        }

        // 2. Find the 'STAFF LOAN INSTALLMENT' salary component
        const componentRes = await client.query(
            "SELECT id FROM salary_components WHERE name ILIKE 'STAFF LOAN INSTALLMENT'"
        );
        if (componentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Salary component "STAFF LOAN INSTALLMENT" not found in settings. Please create it first.' });
        }
        const loanComponentId = componentRes.rows[0].id;

        // 3. UPSERT into employee_salary_structure (same logic as Governance path)
        const checkStruct = await client.query(
            'SELECT 1 FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
            [loan.employee_id, loanComponentId]
        );

        if (checkStruct.rows.length > 0) {
            await client.query(`
                UPDATE employee_salary_structure 
                SET amount = $1, installments_remaining = $2, is_locked = true, lock_reason = $3
                WHERE employee_id = $4 AND component_id = $5
            `, [loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`, loan.employee_id, loanComponentId]);
        } else {
            await client.query(`
                INSERT INTO employee_salary_structure (employee_id, component_id, amount, installments_remaining, is_locked, lock_reason)
                VALUES ($1, $2, $3, $4, true, $5)
            `, [loan.employee_id, loanComponentId, loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`]);
        }

        // 4. Update loan status
        const result = await client.query(
            `UPDATE employee_loans 
             SET status = 'Approved', approved_by = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [req.user.id, id]
        );

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Reject a loan request
// @route   POST /api/loans/:id/reject
// @access  Private (Admin/HR Manager)
const rejectLoan = async (req, res) => {
    const { id } = req.params;

    try {
        const loanRes = await db.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0) return res.status(404).json({ message: 'Loan request not found' });

        const loan = loanRes.rows[0];
        if (loan.status !== 'Pending') return res.status(400).json({ message: 'Loan is already processed.' });

        // Segregation of Duties: Requester cannot be Rejector
        if (String(loan.requested_by) === String(req.user.id)) {
            return res.status(403).json({ message: 'Segregation of duties: You cannot reject your own loan request.' });
        }

        const result = await db.query(
            `UPDATE employee_loans 
             SET status = 'Rejected', approved_by = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [req.user.id, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get payment history for a specific loan
// @route   GET /api/loans/:id/payments
// @access  Private (Admin/HR Manager)
const getLoanPayments = async (req, res) => {
    const { id } = req.params;
    try {
        const payments = await db.query(`
            SELECT lp.*, u.name as created_by_name
            FROM loan_payments lp
            LEFT JOIN users u ON lp.created_by = u.id
            WHERE lp.loan_id = $1 AND lp.status = 'Approved'
            ORDER BY lp.payment_date ASC, lp.created_at ASC
        `, [id]);
        res.status(200).json(payments.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a manual (extra) payment to reduce loan balance (requires Governance approval)
// @route   POST /api/loans/:id/manual-payment
// @access  Private (Admin/HR Manager)
const addManualPayment = async (req, res) => {
    const { id } = req.params;
    const { amount, note, payment_date } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'A valid payment amount is required.' });
    }

    try {
        // 1. Validate loan exists and is active
        const loanRes = await db.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0) return res.status(404).json({ message: 'Loan not found.' });
        const loan = loanRes.rows[0];

        if (loan.status === 'Rejected' || loan.status === 'Pending') {
            return res.status(400).json({ message: 'Manual payment can only be applied to an active (Approved) loan.' });
        }

        // 2. Check no other pending manual payment exists for this loan
        const existingPending = await db.query(
            "SELECT id FROM loan_payments WHERE loan_id = $1 AND type = 'manual' AND status = 'Pending'",
            [id]
        );
        if (existingPending.rows.length > 0) {
            return res.status(400).json({ message: 'A manual payment for this loan is already awaiting approval.' });
        }

        // 3. Insert a PENDING record — awaits Governance approval before applying
        const result = await db.query(`
            INSERT INTO loan_payments (loan_id, payment_date, amount, type, note, created_by, status)
            VALUES ($1, $2, $3, 'manual', $4, $5, 'Pending')
            RETURNING *
        `, [id, payment_date || new Date().toISOString().split('T')[0], parseFloat(amount), note || null, req.user.id]);

        res.status(201).json({
            message: 'Manual payment submitted for approval. It will appear in the Governance panel.',
            payment: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitLoan,
    getLoans,
    approveLoan,
    rejectLoan,
    getLoanPayments,
    addManualPayment
};
