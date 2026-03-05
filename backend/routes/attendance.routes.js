const express = require('express');
const router = express.Router();
const {
    logAttendance,
    getAttendance,
    updateAttendance,
    deleteAttendance,
    getMonthlySummary,
    bulkLogAttendance,
    getMyAttendance
} = require('../controllers/attendance.controller');
const { getPolicy, updatePolicy } = require('../controllers/attendance_policy.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

// Policy
router.get('/policy', protect, getPolicy);
router.put('/policy', protect, checkPermission('MANAGE_ATTENDANCE'), updatePolicy);

// Public/Shared or Device Endpoint (could be secured differently)
// For now protecting with token, assuming admin/hr inputs manually or middleware script uses token
router.post('/', protect, checkPermission('MANAGE_ATTENDANCE'), logAttendance);
router.post('/bulk', protect, checkPermission('MANAGE_ATTENDANCE'), bulkLogAttendance);

// View Logs
router.get('/my', protect, getMyAttendance);
router.get('/', protect, checkPermission('VIEW_ATTENDANCE'), getAttendance);

// Edit/Delete (HR Manager Only)
router.put('/:id', protect, checkPermission('MANAGE_ATTENDANCE'), updateAttendance);
router.delete('/:id', protect, checkPermission('MANAGE_ATTENDANCE'), deleteAttendance);

// Summary
router.get('/summary', protect, checkPermission('VIEW_ATTENDANCE'), getMonthlySummary);
router.post('/sync', protect, checkPermission('MANAGE_ATTENDANCE'), require('../controllers/attendance.controller').syncAttendanceWithLeaves);

module.exports = router;
