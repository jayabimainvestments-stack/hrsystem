const db = require('../config/db');

// @desc    Submit resignation
// @route   POST /api/resignations
// @access  Private (Employee)
const submitResignation = async (req, res) => {
    const { reason, desired_last_day } = req.body;
    try {
        // Check if employee record exists for this user
        const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empRes.rows.length === 0) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }
        const employeeId = empRes.rows[0].id;

        // Check if already pending
        const existing = await db.query('SELECT * FROM resignations WHERE employee_id = $1 AND status = $2', [employeeId, 'Pending']);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'You already have a pending resignation request' });
        }

        const result = await db.query(
            'INSERT INTO resignations (employee_id, reason, desired_last_day) VALUES ($1, $2, $3) RETURNING *',
            [employeeId, reason, desired_last_day]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all resignations (admin) or self (employee)
// @route   GET /api/resignations
// @access  Private
const getResignations = async (req, res) => {
    try {
        let query = `
            SELECT r.*, e.id as emp_id, u.name, u.email 
            FROM resignations r
            JOIN employees e ON r.employee_id = e.id
            JOIN users u ON e.user_id = u.id
        `;
        let params = [];

        if (req.user.role !== 'Admin' && req.user.role !== 'HR Manager') {
            // Filter for self
            query += ` WHERE u.id = $1`;
            params.push(req.user.id);
        }

        query += ` ORDER BY r.created_at DESC`;

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update resignation status
// @route   PUT /api/resignations/:id
// @access  Private (Admin/HR)
const updateResignationStatus = async (req, res) => {
    const { status, exit_interview_notes, clearance_it, clearance_finance, clearance_hr } = req.body;
    const resignationId = req.params.id;

    try {
        // Fetch current record
        const current = await db.query('SELECT * FROM resignations WHERE id = $1', [resignationId]);
        if (current.rows.length === 0) return res.status(404).json({ message: 'Resignation record not found' });

        const resignation = current.rows[0];

        // Enforce Clearance logic for 'Completed' status
        if (status === 'Completed') {
            const it = clearance_it !== undefined ? clearance_it : resignation.clearance_it;
            const finance = clearance_finance !== undefined ? clearance_finance : resignation.clearance_finance;
            const hr = clearance_hr !== undefined ? clearance_hr : resignation.clearance_hr;

            if (!it || !finance || !hr) {
                return res.status(400).json({
                    message: 'Final closure rejected: IT, Finance, and HR clearances must be completed first.',
                    clearance_status: { it, finance, hr }
                });
            }
        }

        const result = await db.query(
            `UPDATE resignations 
             SET status = $1, 
                 exit_interview_notes = COALESCE($2, exit_interview_notes), 
                 clearance_it = COALESCE($3, clearance_it),
                 clearance_finance = COALESCE($4, clearance_finance),
                 clearance_hr = COALESCE($5, clearance_hr),
                 approved_by = $6, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [status, exit_interview_notes, clearance_it, clearance_finance, clearance_hr, req.user.id, resignationId]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitResignation,
    getResignations,
    updateResignationStatus
};
