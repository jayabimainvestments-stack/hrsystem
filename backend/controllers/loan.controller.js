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

    try {
        // 1. Get Loan
        const loanRes = await db.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0) return res.status(404).json({ message: 'Loan request not found' });

        const loan = loanRes.rows[0];
        if (loan.status !== 'Pending') return res.status(400).json({ message: 'Loan is already processed.' });

        // Segregation of Duties: Requester cannot be Approver
        if (String(loan.requested_by) === String(req.user.id)) {
            return res.status(403).json({ message: 'Segregation of duties: You cannot approve your own loan request.' });
        }

        // 2. Update Status
        const result = await db.query(
            `UPDATE employee_loans 
             SET status = 'Approved', approved_by = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [req.user.id, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
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

module.exports = {
    submitLoan,
    getLoans,
    approveLoan,
    rejectLoan
};
