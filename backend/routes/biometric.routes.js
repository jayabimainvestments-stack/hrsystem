const express = require('express');
const router = express.Router();
const { processPunch, bulkProcessPunches, registerDevice, getDevices, deleteDevice } = require('../controllers/biometric.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

// Public-facing for devices (Secure with API Key in body)
router.post('/punch', processPunch);
router.post('/punch-bulk', bulkProcessPunches);

// Protected for Admin
router.get('/devices', protect, checkPermission('MANAGE_ATTENDANCE'), getDevices);
router.post('/register', protect, checkPermission('MANAGE_ATTENDANCE'), registerDevice);
router.delete('/devices/:id', protect, checkPermission('MANAGE_ATTENDANCE'), deleteDevice);

module.exports = router;
