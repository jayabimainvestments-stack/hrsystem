const express = require('express');
const router = express.Router();
const { getPayrollFinanceExport, getStatutoryReport, getAuditSummary, getPointInTimeHeadcount, generatePayslipPDF, exportBankCSV, getJournalExport, getConsolidatedSummary, getConsolidatedPayrollReport, getEPFFormC, getETFFormR4 } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const auditLog = require('../middleware/audit.middleware');

router.get('/payroll-finance/:month', protect, checkPermission('VIEW_ALL_REPORTS'), getPayrollFinanceExport);
router.get('/statutory/:month', protect, checkPermission('VIEW_ALL_REPORTS'), getStatutoryReport);
router.get('/audit-summary', protect, checkPermission('VIEW_ALL_REPORTS'), getAuditSummary);
router.get('/headcount/:date', protect, checkPermission('VIEW_ALL_REPORTS'), getPointInTimeHeadcount);
router.get('/payroll/:id/pdf', protect, auditLog('DOWNLOAD_PAYSLIP', 'payroll'), generatePayslipPDF);
router.get('/payroll/export/bank', protect, checkPermission('MANAGE_PAYROLL'), auditLog('EXPORT_BANK_CSV', 'payroll'), exportBankCSV);
router.get('/payroll/export/journal', protect, checkPermission('MANAGE_PAYROLL'), auditLog('EXPORT_JOURNAL_CSV', 'payroll'), getJournalExport);
router.get('/payroll/consolidated', protect, checkPermission('MANAGE_PAYROLL'), auditLog('VIEW_CONSOLIDATED_REPORT', 'payroll'), getConsolidatedPayrollReport);
router.get('/payroll/epf-form-c', protect, checkPermission('MANAGE_PAYROLL'), auditLog('VIEW_EPF_FORM_C', 'payroll'), getEPFFormC);
router.get('/payroll/etf-form-r4', protect, checkPermission('MANAGE_PAYROLL'), auditLog('VIEW_ETF_FORM_R4', 'payroll'), getETFFormR4);

module.exports = router;
