const express = require('express');
const router = express.Router();
const { assignTasks, getTasks, updateTaskStatus } = require('../controllers/onboarding.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.post('/tasks', protect, checkPermission('MANAGE_EMPLOYEES'), assignTasks);
router.get('/tasks/:employeeId', protect, getTasks); // Employees can view their own, Managers can view all. (Simpler auth for now)
router.put('/tasks/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateTaskStatus);

module.exports = router;
