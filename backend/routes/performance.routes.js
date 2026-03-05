const express = require('express');
const router = express.Router();
const {
    createAppraisal,
    getEmployeeAppraisals,
    getAllAppraisals,
    getPerformanceConfig,
    getEmployeePerformanceConfig,
    saveEmployeePerformanceConfig,
    submitWeeklyData,
    getPerformanceSummary,
    getMonthlyApprovals,
    updateMonthlyApproval,
    approveAllMonthlyPerformance,
    getPerformanceMonthStatus,
    createMetric,
    updateMetric,
    deleteMetric
} = require('../controllers/performance.controller');
const { protect } = require('../middleware/auth.middleware');
const auditLog = require('../middleware/audit.middleware');

// Appraisal Routes (Legacy/Existing)
router.post('/', protect, auditLog('CREATE_APPRAISAL'), createAppraisal);
router.get('/', protect, getAllAppraisals);
router.get('/:employeeId', protect, getEmployeeAppraisals);

// --- NEW PERFORMANCE SCORING ROUTES ---
router.get('/config', protect, getPerformanceConfig);
router.get('/config/:employeeId', protect, getEmployeePerformanceConfig);
router.post('/config/:employeeId', protect, auditLog('SAVE_EMPLOYEE_PERFORMANCE_TARGETS'), saveEmployeePerformanceConfig);
router.post('/weekly', protect, auditLog('SUBMIT_WEEKLY_PERFORMANCE'), submitWeeklyData);
router.get('/summary/:employeeId/:month', protect, getPerformanceSummary);
router.get('/my/summary/:month', protect, require('../controllers/performance.controller').getMyPerformanceSummary);
router.get('/approvals/status', protect, getPerformanceMonthStatus); // NEW
router.get('/approvals/:month', protect, getMonthlyApprovals);
router.post('/approvals/bulk', protect, auditLog('BULK_APPROVE_PERFORMANCE'), approveAllMonthlyPerformance);
router.post('/approvals', protect, updateMonthlyApproval);

router.post('/metrics', protect, auditLog('CREATE_PERFORMANCE_METRIC'), createMetric);
router.put('/metrics/:id', protect, auditLog('UPDATE_PERFORMANCE_METRIC'), updateMetric);
router.delete('/metrics/:id', protect, auditLog('DELETE_PERFORMANCE_METRIC'), deleteMetric);

module.exports = router;

