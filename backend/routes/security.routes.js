const express = require('express');
const router = express.Router();
const { getRoles, getAllPermissions, createRole, updateRolePermissions, getUserPermissions, updateUserPermissions } = require('../controllers/security.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/roles', protect, checkPermission('MANAGE_ROLES'), getRoles);
router.get('/permissions', protect, checkPermission('MANAGE_ROLES'), getAllPermissions);
router.post('/roles', protect, checkPermission('MANAGE_ROLES'), createRole);
router.put('/roles/:role', protect, checkPermission('MANAGE_ROLES'), updateRolePermissions);
router.get('/users/:userId/permissions', protect, checkPermission('MANAGE_EMPLOYEES'), getUserPermissions);
router.put('/users/:userId/permissions', protect, checkPermission('MANAGE_EMPLOYEES'), updateUserPermissions);

module.exports = router;
