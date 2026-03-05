const express = require('express');
const router = express.Router();
const { submitLoan, getLoans, approveLoan, rejectLoan } = require('../controllers/loan.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are protected and restricted to Admin/HR Manager
router.use(protect);

router.post('/', authorize('Admin', 'HR Manager'), submitLoan);
router.get('/', authorize('Admin', 'HR Manager'), getLoans);
router.post('/:id/approve', authorize('Admin', 'HR Manager'), approveLoan);
router.post('/:id/reject', authorize('Admin', 'HR Manager'), rejectLoan);

module.exports = router;
