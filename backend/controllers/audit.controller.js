const db = require('../config/db');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
    try {
        const { user_id, action, from_date, to_date, limit = 100 } = req.query;

        let query = `
            SELECT al.*, u.name as user_name 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (user_id) {
            query += ` AND al.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }
        if (action) {
            query += ` AND al.action ILIKE $${paramCount}`;
            params.push(`%${action}%`);
            paramCount++;
        }
        if (from_date) {
            query += ` AND al.created_at >= $${paramCount}`;
            params.push(from_date);
            paramCount++;
        }
        if (to_date) {
            query += ` AND al.created_at <= $${paramCount}`;
            params.push(`${to_date} 23:59:59`); // End of day
            paramCount++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAuditLogs
};
