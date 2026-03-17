/**
 * ZKTeco ADMS iclock Routes
 * The device communicates via /iclock/* endpoints.
 * These are PUBLIC endpoints (no auth token - device identifies via SN).
 */

const express = require('express');
const router = express.Router();
const {
    handleInitHandshake,
    handleAttendancePush,
    handleGetRequest,
    handleDeviceCmd
} = require('../controllers/iclock.controller');

// Handshake: device announces itself and gets configuration
router.get('/cdata', handleInitHandshake);

// Data push: device sends attendance logs
router.post('/cdata', handleAttendancePush);

// Command poll: device asks if server has any commands for it
router.get('/getrequest', handleGetRequest);

// Command acknowledgement: device confirms it executed our command
router.post('/devicecmd', handleDeviceCmd);

module.exports = router;
