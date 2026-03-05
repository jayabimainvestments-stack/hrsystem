const db = require('../config/db');

// @desc    Upload document metadata (File upload handled by multer middleware usually, simplified here)
// @route   POST /api/documents
// @access  Private
// @desc    Upload document
// @route   POST /api/documents
// @access  Private
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { title, category, target_user_id } = req.body;

        // Determine owner: 
        // If Admin/HR providing target_user_id, use that.
        // Else default to self (Personal upload)
        let ownerId = req.user.id;
        if (target_user_id && (req.user.role === 'Admin' || req.user.role === 'HR Manager')) {
            ownerId = target_user_id;
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        const fileSize = req.file.size;

        const result = await db.query(
            `INSERT INTO documents 
            (user_id, title, file_path, file_type, category, uploaded_by, file_size) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [ownerId, title, filePath, fileType, category || 'General', req.user.id, fileSize]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        // Cleanup file if DB insert fails
        if (req.file) {
            // require fs if not imported (but implementation would rely on module structure)
        }
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get documents for a specific user or self
// @route   GET /api/documents?user_id=123
// @access  Private
const getDocuments = async (req, res) => {
    try {
        let targetId = req.user.id;

        // Admin/HR can view others
        if (req.query.user_id && (req.user.role === 'Admin' || req.user.role === 'HR Manager')) {
            targetId = req.query.user_id;
        }

        const result = await db.query(
            `SELECT d.*, u.name as uploader_name 
             FROM documents d
             LEFT JOIN users u ON d.uploaded_by = u.id
             WHERE d.user_id = $1 
             ORDER BY d.uploaded_at DESC`,
            [targetId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
};
