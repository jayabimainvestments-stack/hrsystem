const express = require('express');
const router = express.Router();
const { 
    submitResignation, 
    getResignations, 
    getEmployeeResignation, 
    updateResignationStatus 
} = require('../controllers/resignation.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.post('/', protect, submitResignation);
router.get('/', protect, getResignations);
router.get('/employee/:employeeId', protect, getEmployeeResignation);
router.put('/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateResignationStatus);

module.exports = router;
