const express = require('express');
const router = express.Router();
const {
    applyForLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getMyBalances,
    getLeaveTypes,
    createLeaveType,
    deleteLeaveType,
    syncAllBalances
} = require('../controllers/leave.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.post('/', protect, checkPermission('APPLY_LEAVE'), auditLog('APPLY_LEAVE', 'leaves'), applyForLeave);
router.post('/sync-balances', protect, checkPermission('MANAGE_PAYROLL'), auditLog('SYNC_LEAVE_BALANCES', 'leave_balances'), syncAllBalances);
router.get('/my', protect, getMyLeaves);
router.get('/balances', protect, getMyBalances);
router.get('/', protect, checkPermission('APPROVE_LEAVE'), getAllLeaves);
router.put('/:id', protect, checkPermission('APPROVE_LEAVE'), auditLog('UPDATE_LEAVE_STATUS', 'leaves'), updateLeaveStatus);

// Leave Types (Absence Protocol)
router.get('/types', protect, getLeaveTypes);
router.post('/types', protect, checkPermission('MANAGE_PAYROLL'), createLeaveType); // Using MANAGE_PAYROLL as it affects payroll broadly
router.delete('/types/:id', protect, checkPermission('MANAGE_PAYROLL'), deleteLeaveType);

module.exports = router;
