const express = require('express');
const router = express.Router();
const { calculateDeductions } = require('../controllers/deduction.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.post('/calculate', protect, checkPermission('MANAGE_PAYROLL'), calculateDeductions);
router.get('/test', (req, res) => res.json({ message: 'Deduction routes working' }));

module.exports = router;
