const express = require('express');
const router = express.Router();
const { generatePayslipPDF, exportBankCSV } = require('../controllers/reports.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.get('/payroll/:id/pdf', protect, auditLog('DOWNLOAD_PAYSLIP', 'payroll'), generatePayslipPDF);
router.get('/payroll/export/bank', protect, checkPermission('MANAGE_PAYROLL'), auditLog('EXPORT_BANK_CSV', 'payroll'), exportBankCSV);

module.exports = router;
