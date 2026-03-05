const express = require('express');
const router = express.Router();
const {
    getDepartments, createDepartment, updateDepartment, deleteDepartment,
    getDesignations, createDesignation, updateDesignation, deleteDesignation,
    getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType
} = require('../controllers/meta.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

// Departments
router.get('/departments', protect, getDepartments);
router.post('/departments', protect, checkPermission('MANAGE_EMPLOYEES'), createDepartment);
router.put('/departments/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateDepartment);
router.delete('/departments/:id', protect, checkPermission('MANAGE_EMPLOYEES'), deleteDepartment);

// Designations
router.get('/designations', protect, getDesignations);
router.post('/designations', protect, checkPermission('MANAGE_EMPLOYEES'), createDesignation);
router.put('/designations/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateDesignation);
router.delete('/designations/:id', protect, checkPermission('MANAGE_EMPLOYEES'), deleteDesignation);

// Leave Protocols
router.get('/leave-protocols', protect, getLeaveTypes);
router.post('/leave-protocols', protect, checkPermission('MANAGE_EMPLOYEES'), createLeaveType);
router.put('/leave-protocols/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateLeaveType);
router.delete('/leave-protocols/:id', protect, checkPermission('MANAGE_EMPLOYEES'), deleteLeaveType);

module.exports = router;
