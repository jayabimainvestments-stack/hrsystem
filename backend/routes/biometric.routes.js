const express = require('express');
const router = express.Router();
const { processPunch, bulkProcessPunches, registerDevice, getDevices, deleteDevice, triggerDeviceSync } = require('../controllers/biometric.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

// Public-facing for devices (Secure with API Key in body)
router.post('/punch', processPunch);
router.post('/punch-bulk', bulkProcessPunches);
router.post('/init-daily', require('../controllers/biometric.controller').initDailyAttendance);

// Override sync trigger: Admin/HR can manually trigger a pull from the local device
router.post('/sync-device', protect, checkPermission('MANAGE_ATTENDANCE'), triggerDeviceSync);

// Protected for Admin
router.get('/devices', protect, checkPermission('MANAGE_ATTENDANCE'), getDevices);
router.post('/register', protect, checkPermission('MANAGE_ATTENDANCE'), registerDevice);
router.delete('/devices/:id', protect, checkPermission('MANAGE_ATTENDANCE'), deleteDevice);

module.exports = router;
