const express = require('express');
const router = express.Router();
const { getPendingChanges, actOnPendingChange } = require('../controllers/governance.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.get('/pending', protect, checkPermission('MANAGE_PAYROLL'), getPendingChanges);
router.post('/act', protect, checkPermission('MANAGE_PAYROLL'), auditLog('PROCESS_GOVERNANCE', 'pending_changes'), actOnPendingChange);

module.exports = router;
