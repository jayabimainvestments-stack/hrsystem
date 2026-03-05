const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeeById, getMyProfile, createEmployee, updateEmployee } = require('../controllers/employee.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.get('/me', protect, getMyProfile);
router.get('/', protect, checkPermission('VIEW_DASHBOARD'), getEmployees);
router.get('/:id', protect, checkPermission('VIEW_OWN_PROFILE'), getEmployeeById);
// Upgraded to Granular Permission
router.get('/:id/salary-structure', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), require('../controllers/employee.controller').getSalaryStructure);
router.post('/', protect, checkPermission('MANAGE_EMPLOYEES'), auditLog('CREATE_EMPLOYEE', 'employees'), createEmployee);
router.put('/:id', protect, checkPermission('MANAGE_EMPLOYEES'), auditLog('UPDATE_EMPLOYEE', 'employees'), updateEmployee);
router.put('/:id/promote', protect, checkPermission('MANAGE_EMPLOYEES'), auditLog('PROMOTE_EMPLOYEE', 'employees'), require('../controllers/employee.controller').promoteEmployee);

module.exports = router;
