const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
    submitRequest,
    getRequests,
    approveRequest,
    rejectRequest,
    getMonthStatus
} = require('../controllers/financial.controller');

router.post('/requests', protect, authorize('Admin', 'HR Manager'), submitRequest);
router.get('/requests', protect, authorize('Admin', 'HR Manager'), getRequests);
router.get('/requests/status', protect, authorize('Admin', 'HR Manager'), getMonthStatus);
router.post('/requests/:id/approve', protect, authorize('Admin', 'HR Manager'), approveRequest);
router.post('/requests/:id/reject', protect, authorize('Admin', 'HR Manager'), rejectRequest);

module.exports = router;
