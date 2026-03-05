const express = require('express');
const router = express.Router();
const { getSalaryStructure, updateSalaryStructure } = require('../controllers/salary.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.get('/:employeeId', protect, checkPermission('VIEW_ALL_REPORTS'), getSalaryStructure);
router.put('/:employeeId', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), auditLog('REQUEST_SALARY_CHANGE', 'salary_structures'), updateSalaryStructure);

module.exports = router;
