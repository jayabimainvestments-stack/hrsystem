const express = require('express');
const router = express.Router();
const {
    getComponents, createComponent, updateComponent,
    getTaxBrackets, createTaxBracket, deleteTaxBracket,
    getEmployeeStructure, updateEmployeeStructure, getFuelQuotas, deleteAllEmployeeStructures,
    snapshotBaseline, approveMonthlyOverride, bulkApproveOverrides, deleteMonthlyOverride, deleteAllMonthlyOverrides,
    updateMonthlyOverrides, getConsolidatedBaseline
} = require('../controllers/payroll.settings.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

// Consolidated Baseline
router.get('/consolidated', protect, getConsolidatedBaseline);

// Components
router.get('/components', protect, getComponents);
router.post('/components', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), createComponent);
router.put('/components/:id', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), updateComponent);

// Tax Brackets
router.get('/tax-brackets', protect, getTaxBrackets);
router.post('/tax-brackets', protect, checkPermission('MANAGE_PAYROLL'), createTaxBracket);
router.delete('/tax-brackets/:id', protect, checkPermission('MANAGE_PAYROLL'), deleteTaxBracket);

// Structure
router.get('/structure/:employeeId', protect, getEmployeeStructure);
router.post('/structure', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), updateEmployeeStructure);
router.get('/fuel-quotas', protect, getFuelQuotas);
router.delete('/structure/all', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), deleteAllEmployeeStructures);

// Monthly Overrides Extensions
router.post('/overrides/snapshot', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), snapshotBaseline);
router.post('/overrides/update', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), updateMonthlyOverrides);
router.post('/overrides/:id/approve', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), approveMonthlyOverride);
router.post('/overrides/bulk-approve', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), bulkApproveOverrides);
router.delete('/overrides/:id', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), deleteMonthlyOverride);
router.delete('/overrides/all', protect, checkPermission('MANAGE_SALARY_STRUCTURE'), deleteAllMonthlyOverrides);

module.exports = router;
