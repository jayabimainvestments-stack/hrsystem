const express = require('express');
const router = express.Router();
const { getManualDeductions, saveManualDeduction, approveDeduction, getDeductionMonthStatus } = require('../controllers/manual_deduction.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are protected and restricted to Admin/HR Manager
router.use(protect);
router.use(authorize('Admin', 'HR Manager'));

router.get('/', getManualDeductions);
router.get('/status', getDeductionMonthStatus); // NEW
router.post('/', saveManualDeduction);
router.post('/ignore', ignoreDeduction);
router.post('/:id/approve', approveDeduction);

module.exports = router;
