const express = require('express');
const router = express.Router();
const { uploadDocument, getDocuments } = require('../controllers/document.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/', protect, checkPermission('MANAGE_DOCUMENTS'), upload.single('file'), auditLog('UPLOAD_DOCUMENT', 'documents'), uploadDocument);
router.get('/', protect, checkPermission('MANAGE_DOCUMENTS'), getDocuments);

module.exports = router;
