const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/', protect, checkPermission('VIEW_AUDIT_LOGS'), getAuditLogs);
router.get('/logs', protect, checkPermission('VIEW_AUDIT_LOGS'), getAuditLogs);

module.exports = router;
