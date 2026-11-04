const express = require('express');
const router = express.Router();
const { assignTasks, getTasks, updateTaskStatus, deleteTask } = require('../controllers/onboarding.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.post('/tasks', protect, checkPermission('MANAGE_EMPLOYEES'), assignTasks);
router.get('/tasks/:employeeId', protect, getTasks);
router.get('/checklist/:employeeId', protect, getTasks); // Alias for compatibility with OnboardingTab
router.put('/tasks/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateTaskStatus);
router.delete('/tasks/:id', protect, checkPermission('MANAGE_EMPLOYEES'), deleteTask);

module.exports = router;
