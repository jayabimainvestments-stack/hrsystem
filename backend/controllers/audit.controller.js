const db = require('../config/db');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
    try {
        const { user, user_id, action, module, dateFrom, dateTo, from_date, to_date, limit = 100 } = req.query;

        // Map frontend aliases to backend internal names
        const effectiveUser = user || user_id;
        const effectiveFrom = from_date || dateFrom;
        const effectiveTo = to_date || dateTo;

        let query = `
            SELECT al.*, u.name as user_name 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (effectiveUser) {
            // Check if it's a numeric ID or an Email/Name
            if (!isNaN(effectiveUser)) {
                query += ` AND al.user_id = $${paramCount}`;
                params.push(parseInt(effectiveUser));
            } else {
                query += ` AND (u.email ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
                params.push(`%${effectiveUser}%`);
            }
            paramCount++;
        }

        if (action) {
            query += ` AND al.action ILIKE $${paramCount}`;
            params.push(`%${action}%`);
            paramCount++;
        }

        if (module) {
            query += ` AND al.entity ILIKE $${paramCount}`;
            params.push(`%${module}%`);
            paramCount++;
        }

        if (effectiveFrom) {
            query += ` AND al.created_at >= $${paramCount}`;
            params.push(effectiveFrom);
            paramCount++;
        }

        if (effectiveTo) {
            query += ` AND al.created_at <= $${paramCount}`;
            params.push(`${effectiveTo} 23:59:59`); // End of day
            paramCount++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Audit Query Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAuditLogs
};
