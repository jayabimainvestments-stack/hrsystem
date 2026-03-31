const db = require('../config/db');

// @desc    Submit a new financial request (e.g., Fuel Allowance)
// @route   POST /api/financial/requests
// @access  Private (HR/Admin)
const submitRequest = async (req, res) => {
    const { month, type, data } = req.body; // data: [{ employee_id, liters, amount }]

    if (!month || !type || !data || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Invalid request data' });
    }

    try {
        const result = await db.query(
            `INSERT INTO financial_requests (month, type, data, requested_by, status)
             VALUES ($1, $2, $3, $4, 'Pending')
             RETURNING *`,
            [month, type, JSON.stringify(data), req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all financial requests
// @route   GET /api/financial/requests
// @access  Private
const getRequests = async (req, res) => {
    const { type, month } = req.query;
    try {
        let query = `
            SELECT fr.*, u.name as requested_by_name 
            FROM financial_requests fr
            JOIN users u ON fr.requested_by = u.id
        `;
        const params = [];
        if (type) {
            params.push(type);
            query += ` WHERE fr.type = $${params.length} `;
        }

        if (month) {
            params.push(month);
            query += ` ${params.length > 1 ? 'AND' : 'WHERE'} fr.month = $${params.length} `;
        }

        query += ` ORDER BY fr.created_at DESC `;

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a request and update salary structure (LOCKING it)
// @route   POST /api/financial/requests/:id/approve
// @access  Private (Admin/HR Manager)
const { processApprovedRequest } = require('../services/financial.service');

// @desc    Approve a request and update salary structure (LOCKING it)
// @route   POST /api/financial/requests/:id/approve
// @access  Private (Admin/HR Manager)
const approveRequest = async (req, res) => {
    const { id } = req.params;

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Request
            const reqRes = await client.query('SELECT * FROM financial_requests WHERE id = $1', [id]);
            if (reqRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Request not found' });
            }
            const request = reqRes.rows[0];

            if (request.status !== 'Pending') {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Request is not pending' });
            }

            // Segregation of Duties: Requestor cannot be Approver
            if (String(request.requested_by) === String(req.user.id)) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'You cannot approve your own request. Segregation of duties required.' });
            }

            // 2. Update Status
            await client.query(
                'UPDATE financial_requests SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3',
                ['Approved', req.user.id, id]
            );

            // 3. Process Data via Shared Service
            await processApprovedRequest(client, request);

            await client.query('COMMIT');
            res.status(200).json({ message: 'Request approved and transferred to monthly salary overrides.' });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject a request
// @route   POST /api/financial/requests/:id/reject
// @access  Private (Admin/HR Manager)
const rejectRequest = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('SELECT * FROM financial_requests WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = result.rows[0];

        if (request.status !== 'Pending') {
            return res.status(400).json({ message: 'Request is not pending' });
        }

        // Segregation of Duties
        if (String(request.requested_by) === String(req.user.id)) {
            return res.status(403).json({ message: 'You cannot reject your own request. Segregation of duties required.' });
        }

        const { reason } = req.body;

        await db.query(
            'UPDATE financial_requests SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
            ['Rejected', req.user.id, reason, id]
        );

        res.status(200).json({ message: 'Request rejected.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getMonthStatus = async (req, res) => {
    const { month, type } = req.query;
    if (!month || !type) return res.status(400).json({ message: 'Month and Type are required' });

    try {
        const result = await db.query(
            'SELECT status, approved_by, requested_by, created_at, updated_at FROM financial_requests WHERE month = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
            [month, type]
        );

        if (result.rows.length > 0) {
            const request = result.rows[0];
            res.status(200).json({
                exists: true,
                transferred: request.status === 'Approved',
                status: request.status,
                ...request
            });
        } else {
            res.status(200).json({ exists: false, transferred: false });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitRequest,
    getRequests,
    approveRequest,
    rejectRequest,
    getMonthStatus
};
