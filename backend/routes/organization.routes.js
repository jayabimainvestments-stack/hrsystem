const express = require('express');
const router = express.Router();
const { getOrganizationDetails, updateOrganizationDetails } = require('../controllers/organization.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/', protect, getOrganizationDetails);
router.put('/', protect, checkPermission('MANAGE_EMPLOYEES'), updateOrganizationDetails);

module.exports = router;
