const express = require('express');
const router = express.Router();
const { submitResignation, getResignations, updateResignationStatus } = require('../controllers/resignation.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.post('/', protect, submitResignation);
router.get('/', protect, getResignations);
router.put('/:id', protect, checkPermission('MANAGE_EMPLOYEES'), updateResignationStatus);

module.exports = router;
