const express = require('express');
const router = express.Router();
const {
    createPayroll,
    getMyPayroll,
    getAllPayroll,
    getPayrollDetails,
    updatePayroll,
    getLiabilities,
    payLiability,
    getLiabilityBreakdown,
    payPayrollStatutory,
    payWelfare,
    reviewPayroll,
    approvePayroll,
    getPayrollPreview,
    deletePayroll,
    deleteAllPayrolls,
    getMonthlyOverrides,
    approveLiability,
    getPayrollReadiness
} = require('../controllers/payroll.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.post('/', protect, checkPermission('MANAGE_PAYROLL'), auditLog('PROCESS_PAYROLL', 'payroll'), createPayroll);
router.get('/preview/:user_id/:month/:year', protect, checkPermission('MANAGE_PAYROLL'), getPayrollPreview);
router.get('/my', protect, checkPermission('VIEW_OWN_PAYROLL'), getMyPayroll);
router.get('/', protect, checkPermission('MANAGE_PAYROLL'), getAllPayroll);
router.get('/liabilities', protect, checkPermission('MANAGE_PAYROLL'), getLiabilities);
router.get('/liabilities/breakdown', protect, checkPermission('MANAGE_PAYROLL'), getLiabilityBreakdown);
router.post('/liabilities/pay', protect, checkPermission('MANAGE_PAYROLL'), payLiability);
router.post('/liabilities/:id/approve', protect, checkPermission('MANAGE_PAYROLL'), auditLog('APPROVE_LIABILITY', 'liability'), approveLiability);
router.post('/:id/pay-statutory', protect, checkPermission('MANAGE_PAYROLL'), payPayrollStatutory);
router.post('/:id/pay-welfare', protect, checkPermission('MANAGE_PAYROLL'), payWelfare);
router.get('/:id', protect, getPayrollDetails);
router.put('/:id', protect, checkPermission('MANAGE_PAYROLL'), auditLog('UPDATE_PAYROLL', 'payroll'), updatePayroll);
router.delete('/all', protect, checkPermission('MANAGE_PAYROLL'), auditLog('DELETE_ALL_PAYROLLS', 'payroll'), deleteAllPayrolls);
router.delete('/:id', protect, checkPermission('MANAGE_PAYROLL'), auditLog('DELETE_PAYROLL', 'payroll'), deletePayroll);
router.post('/:id/review', protect, checkPermission('MANAGE_PAYROLL'), auditLog('REVIEW_PAYROLL', 'payroll'), reviewPayroll);
router.post('/:id/approve', protect, checkPermission('MANAGE_PAYROLL'), auditLog('APPROVE_PAYROLL', 'payroll'), approvePayroll);
router.get('/overrides', protect, checkPermission('MANAGE_PAYROLL'), getMonthlyOverrides);
router.get('/readiness/:month/:year', protect, checkPermission('MANAGE_PAYROLL'), getPayrollReadiness);

module.exports = router;
