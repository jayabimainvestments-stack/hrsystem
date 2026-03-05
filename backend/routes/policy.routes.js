const express = require('express');
const router = express.Router();
const { getPolicy, updatePolicyRates, updateFuelRate } = require('../controllers/policy.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/', protect, getPolicy);
router.put('/rates', protect, checkPermission('MANAGE_PAYROLL'), updatePolicyRates);
router.patch('/fuel-rate', protect, updateFuelRate);

module.exports = router;
