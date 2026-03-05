const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// Helper - Draw Line
const drawLine = (doc, y) => {
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
};

// @desc    Export Payroll for Finance (JSON/CSV ready)
// @route   GET /api/reports/payroll-finance/:month
// @access  Private (Admin/Finance)
const getPayrollFinanceExport = async (req, res) => {
    try {
        const { month } = req.params;
        const result = await db.query(`
            SELECT 
                u.name as employee_name,
                e.nic_passport,
                b.bank_name,
                b.branch_code,
                b.account_number,
                b.account_holder_name,
                p.net_salary,
                p.month
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            JOIN employees e ON u.id = e.user_id
            LEFT JOIN employee_bank_details b ON u.id = b.user_id
            WHERE p.month = $1
            ORDER BY u.name
        `, [month]);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Statutory Liability Report
// @route   GET /api/reports/statutory/:month
// @access  Private (Admin/Finance)
const getStatutoryReport = async (req, res) => {
    try {
        const { month } = req.params;
        const result = await db.query(`
            SELECT 
                type,
                total_payable,
                paid_amount,
                (total_payable - paid_amount) as balance,
                status,
                last_updated
            FROM payroll_liabilities
            WHERE month = $1
        `, [month]);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Audit Activity Summary
// @route   GET /api/reports/audit-summary
// @access  Private (Admin)
const getAuditSummary = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                action,
                entity,
                COUNT(*) as count,
                MAX(created_at) as last_activity
            FROM audit_logs
            GROUP BY action, entity
            ORDER BY last_activity DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Point-in-time Headcount Report
// @route   GET /api/reports/headcount/:date
// @access  Private (Admin/HR)
const getPointInTimeHeadcount = async (req, res) => {
    try {
        const { date } = req.params;
        const result = await db.query(`
            SELECT COUNT(*) as headcount
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.hire_date <= $1
            AND (e.employment_status != 'Exited' OR EXISTS (
                SELECT 1 FROM resignations r 
                WHERE r.employee_id = e.id AND r.status = 'Completed' AND r.updated_at > $1
            ))
        `, [date]);

        res.status(200).json({ date, headcount: result.rows[0].headcount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate PDF Payslip
// @route   GET /api/reports/payroll/:id/pdf
// @access  Private
const generatePayslipPDF = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch Data
        const payrollRes = await db.query('SELECT * FROM payroll WHERE id = $1', [id]);
        if (payrollRes.rows.length === 0) return res.status(404).json({ message: 'Payroll record not found' });
        const payroll = payrollRes.rows[0];

        // Access Check
        if (req.user.role !== 'Admin' && req.user.role !== 'HR Manager' && payroll.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const detailsRes = await db.query('SELECT * FROM payroll_details WHERE payroll_id = $1', [id]);
        const breakdown = detailsRes.rows;

        const empRes = await db.query(`
            SELECT u.name, e.designation, e.department, e.employee_id, e.nic_passport, e.epf_no 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.id = $1
        `, [payroll.user_id]);
        const employee = empRes.rows[0];

        // 2. Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${employee.employee_id}-${payroll.month}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('JAYABIMA INVESTMENTS', { align: 'center' });
        doc.fontSize(10).text('Payslip for ' + payroll.month + ' ' + payroll.year, { align: 'center' });
        doc.moveDown();
        drawLine(doc, doc.y);
        doc.moveDown();

        // Employee Info
        doc.fontSize(10);
        doc.text(`Name: ${employee.name}`, 50, doc.y);
        doc.text(`ID: ${employee.employee_id}`, 300, doc.y - 12);
        doc.moveDown();
        doc.text(`Designation: ${employee.designation}`, 50, doc.y);
        doc.text(`Department: ${employee.department}`, 300, doc.y - 12);
        doc.moveDown();
        doc.text(`EPF No: ${employee.epf_no || 'N/A'}`, 50, doc.y);
        doc.text(`NIC: ${employee.nic_passport || 'N/A'}`, 300, doc.y - 12);

        doc.moveDown();
        drawLine(doc, doc.y);
        doc.moveDown();

        // Earnings
        doc.fontSize(12).font('Helvetica-Bold').text('Earnings', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.moveDown();

        const earnings = breakdown.filter(i => i.type === 'Earning');
        earnings.forEach(item => {
            doc.text(item.component_name, 50, doc.y);
            doc.text(parseFloat(item.amount).toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });
            doc.moveDown();
        });

        const basicSalary = parseFloat(payroll.basic_salary);
        if (!earnings.find(e => e.component_name.toLowerCase().includes('basic'))) {
            doc.text('Basic Salary', 50, doc.y);
            doc.text(basicSalary.toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });
            doc.moveDown();
        }

        doc.moveDown();
        doc.font('Helvetica-Bold').text('Total Earnings', 50, doc.y);
        const totalEarnings = basicSalary + parseFloat(payroll.bonuses || 0);
        doc.text(totalEarnings.toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });
        doc.font('Helvetica');

        // Spacing before Deductions
        doc.moveDown();
        doc.moveDown();

        drawLine(doc, doc.y);
        doc.moveDown();

        doc.fontSize(12).text('Deductions', { underline: true });
        doc.fontSize(10);
        doc.moveDown();

        const deductions = breakdown.filter(i => i.type === 'Deduction' || i.type === 'Statutory');
        deductions.forEach(item => {
            doc.text(item.component_name, 50, doc.y);
            doc.text(parseFloat(item.amount).toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });
            doc.moveDown();
        });

        doc.moveDown();
        doc.font('Helvetica-Bold').text('Total Deductions', 50, doc.y);
        doc.text(parseFloat(payroll.deductions).toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });

        doc.moveDown();
        drawLine(doc, doc.y);
        doc.moveDown();

        // Net Pay
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('NET PAYABLE', 50, doc.y);
        doc.text(parseFloat(payroll.net_salary).toFixed(2), 200, doc.y - 16, { align: 'right', width: 100 });
        doc.fontSize(10).font('Helvetica');

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
};

// @desc    Export Bank Transfer List
// @route   GET /api/reports/payroll/export/bank
// @access  Private (Admin/Finance)
const exportBankCSV = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const result = await db.query(`
            SELECT 
                u.name as "Account Name",
                e.bank_account_no as "Account Number",
                e.bank_name as "Bank Name",
                e.bank_branch as "Branch",
                p.net_salary as "Amount",
                p.id as "Reference"
            FROM payroll p
            JOIN employees e ON p.user_id = e.user_id
            JOIN users u ON p.user_id = u.id
            WHERE p.month = $1 AND p.status = 'Approved'
        `, [month]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'No approved payroll records found for this month.' });

        const fields = ['Account Name', 'Account Number', 'Bank Name', 'Branch', 'Amount', 'Reference'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment(`bank-transfer-${month}.csv`);
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accounting Journal Entry Export (CSV)
// @route   GET /api/reports/payroll/export/journal
// @access  Private (Admin/Finance)
const getJournalExport = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        // Fetch approved payrolls for the month
        const result = await db.query(`
            SELECT p.*, u.name as employee_name
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            WHERE p.month = $1 AND p.status = 'Approved'
        `, [month]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'No approved payroll records found for this month.' });

        const journalEntries = [];
        const date = new Date().toISOString().split('T')[0]; // Current date as entry date

        // Aggregate Totals
        let totalBasic = 0; // Debit Expense
        let totalAllowances = 0; // Debit Expense
        let totalOT = 0; // Debit Expense (Need to extract from details if not in main table)
        let totalEPF_Employer = 0; // Debit Expense
        let totalETF_Employer = 0; // Debit Expense

        let totalEPF_Payable = 0; // Credit Liability (Employee + Employer)
        let totalETF_Payable = 0; // Credit Liability
        let totalPAYE_Payable = 0; // Credit Liability
        let totalStartSalary_Payable = 0; // Credit Liability (Net Salary)

        // We need details for accurate breakdown
        // Let's iterate and sum up
        for (const row of result.rows) {
            totalBasic += parseFloat(row.basic_salary);
            totalAllowances += parseFloat(row.allowances);
            totalEPF_Employer += parseFloat(row.epf_employer);
            totalETF_Employer += parseFloat(row.etf_employer);

            totalEPF_Payable += (parseFloat(row.epf_employee) + parseFloat(row.epf_employer));
            totalETF_Payable += parseFloat(row.etf_employer);
            totalStartSalary_Payable += parseFloat(row.net_salary);

            // Fetch PAYE from details
            // This is N+1 but acceptable for report generation
            const detailsRes = await db.query('SELECT * FROM payroll_details WHERE payroll_id = $1', [row.id]);
            const details = detailsRes.rows;

            const paye = details.find(d => d.component_name === 'Income Tax (PAYE)');
            if (paye) totalPAYE_Payable += parseFloat(paye.amount);

            const ot = details.find(d => d.component_name === 'Overtime');
            if (ot) totalOT += parseFloat(ot.amount);
        }

        // Adjust Allowances to exclude OT if we track it separately
        totalAllowances -= totalOT;

        // Build Rows
        // Format: Date, Account Code, Description, Debit, Credit
        journalEntries.push({ Date: date, AccountCode: '6001', Description: 'Basic Salaries', Debit: totalBasic.toFixed(2), Credit: '' });
        journalEntries.push({ Date: date, AccountCode: '6002', Description: 'Allowances', Debit: totalAllowances.toFixed(2), Credit: '' });
        if (totalOT > 0) journalEntries.push({ Date: date, AccountCode: '6003', Description: 'Overtime', Debit: totalOT.toFixed(2), Credit: '' });
        journalEntries.push({ Date: date, AccountCode: '6004', Description: 'EPF Employer Expense', Debit: totalEPF_Employer.toFixed(2), Credit: '' });
        journalEntries.push({ Date: date, AccountCode: '6005', Description: 'ETF Employer Expense', Debit: totalETF_Employer.toFixed(2), Credit: '' });

        journalEntries.push({ Date: date, AccountCode: '2001', Description: 'EPF Payable', Debit: '', Credit: totalEPF_Payable.toFixed(2) });
        journalEntries.push({ Date: date, AccountCode: '2002', Description: 'ETF Payable', Debit: '', Credit: totalETF_Payable.toFixed(2) });
        if (totalPAYE_Payable > 0) journalEntries.push({ Date: date, AccountCode: '2003', Description: 'PAYE Tax Payable', Debit: '', Credit: totalPAYE_Payable.toFixed(2) });
        journalEntries.push({ Date: date, AccountCode: '2000', Description: 'Net Salary Payable', Debit: '', Credit: totalStartSalary_Payable.toFixed(2) });

        const fields = ['Date', 'AccountCode', 'Description', 'Debit', 'Credit'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(journalEntries);

        res.header('Content-Type', 'text/csv');
        res.attachment(`journal-entry-${month}.csv`);
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Consolidated Payroll Summary (CSV)
// @route   GET /api/reports/payroll/summary/consolidated
// @access  Private (Admin/Finance)
const getConsolidatedSummary = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const result = await db.query(`
            SELECT p.*, u.name as employee_name, e.employee_id, e.epf_no, e.designation
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            JOIN employees e ON u.id = e.user_id
            WHERE p.month = $1 AND p.status = 'Approved'
            ORDER BY u.name
        `, [month]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'No approved payroll records found for this month.' });

        const summaryRows = [];

        for (const row of result.rows) {
            const detailsRes = await db.query('SELECT * FROM payroll_details WHERE payroll_id = $1', [row.id]);
            const details = detailsRes.rows;

            const basic = parseFloat(row.basic_salary);
            const otItem = details.find(d => d.component_name === 'Overtime');
            const otAmount = otItem ? parseFloat(otItem.amount) : 0;
            const allowances = parseFloat(row.allowances) - otAmount; // Separate OT from allowances

            const gross = basic + allowances + otAmount;

            const epf8 = parseFloat(row.epf_employee);
            const epf12 = parseFloat(row.epf_employer);
            const etf3 = parseFloat(row.etf_employer);

            const payeItem = details.find(d => d.component_name === 'Income Tax (PAYE)');
            const paye = payeItem ? parseFloat(payeItem.amount) : 0;

            const otherDeductions = parseFloat(row.deductions) - epf8 - paye; // Deductions field in payroll table includes all deductions (statutory + others)

            const net = parseFloat(row.net_salary);

            summaryRows.push({
                'Employee ID': row.employee_id,
                'Name': row.employee_name,
                'Designation': row.designation,
                'EPF No': row.epf_no,
                'Basic Salary': basic.toFixed(2),
                'Allowances': allowances.toFixed(2),
                'Overtime': otAmount.toFixed(2),
                'Gross Salary': gross.toFixed(2),
                'EPF (8%)': epf8.toFixed(2),
                'EPF (12%)': epf12.toFixed(2),
                'ETF (3%)': etf3.toFixed(2),
                'PAYE Tax': paye.toFixed(2),
                'Other Deductions': otherDeductions.toFixed(2),
                'Net Salary': net.toFixed(2)
            });
        }

        const fields = [
            'Employee ID', 'Name', 'Designation', 'EPF No',
            'Basic Salary', 'Allowances', 'Overtime', 'Gross Salary',
            'EPF (8%)', 'EPF (12%)', 'ETF (3%)', 'PAYE Tax', 'Other Deductions', 'Net Salary'
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(summaryRows);

        res.header('Content-Type', 'text/csv');
        res.attachment(`payroll-consolidated-${month}.csv`);
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getConsolidatedPayrollReport = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const payrollsRes = await db.query(`
            SELECT 
                p.*, 
                u.name as employee_name, 
                e.employee_id as string_id, 
                e.epf_no, 
                e.designation,
                e.nic_passport as nic,
                eb.account_number as account_no
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            JOIN employees e ON u.id = e.user_id
            LEFT JOIN employee_bank_details eb ON u.id = eb.user_id
            WHERE p.month = $1 AND p.status = 'Approved'
            ORDER BY e.epf_no::integer ASC, u.name ASC
        `, [month]);

        const payrolls = payrollsRes.rows;
        if (payrolls.length === 0) return res.status(200).json({ month, data: [] });

        const results = [];

        for (const p of payrolls) {
            const detailsRes = await db.query('SELECT * FROM payroll_details WHERE payroll_id = $1', [p.id]);
            const details = detailsRes.rows;

            const additions = {};
            const deductions = {};

            let totalAdditionsValue = 0;
            let totalDeductionsValue = 0;

            details.forEach(d => {
                const amt = parseFloat(d.amount);
                if (d.type === 'Earning') {
                    additions[d.component_name] = (additions[d.component_name] || 0) + amt;
                    if (!d.component_name.toLowerCase().includes('basic')) {
                        totalAdditionsValue += amt;
                    }
                } else if (d.type === 'Deduction' || d.type === 'Statutory') {
                    deductions[d.component_name] = (deductions[d.component_name] || 0) + amt;
                    totalDeductionsValue += amt;
                }
            });

            // Ensure Basic Salary is in the additions but separate for logic
            const basicSalary = parseFloat(p.basic_salary);
            additions['Basic Salary'] = basicSalary;

            results.push({
                idx: p.epf_no || p.string_id,
                name: p.employee_name,
                nic: p.nic,
                account_no: p.account_no,
                additions,
                deductions,
                consolidated: {
                    basic: basicSalary,
                    allowance: totalAdditionsValue
                },
                gross_pay: basicSalary + totalAdditionsValue,
                net_pay: parseFloat(p.net_salary),
                employer_contributions: {
                    epf_12: parseFloat(p.epf_employer),
                    etf_3: parseFloat(p.etf_employer)
                }
            });
        }

        res.status(200).json({ month, data: results });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getEPFFormC = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const payrollsRes = await db.query(`
            SELECT 
                p.*, 
                u.name as employee_name, 
                e.epf_no, 
                e.nic_passport as nic
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            JOIN employees e ON u.id = e.user_id
            WHERE p.month = $1 AND p.status = 'Approved'
            ORDER BY e.epf_no::integer ASC
        `, [month]);

        const payrolls = payrollsRes.rows;
        const results = payrolls.map(p => ({
            member_no: p.epf_no,
            name: p.employee_name,
            nic: p.nic,
            earnings: parseFloat(p.basic_salary), // Standard EPF is on basic + certain allowances, here using basic as proxy per standard setup
            employee_8: parseFloat(p.epf_employee),
            employer_12: parseFloat(p.epf_employer),
            total_20: parseFloat(p.epf_employee) + parseFloat(p.epf_employer)
        }));

        res.status(200).json({
            month,
            employer_name: 'JAYABIMA INVESTMENTS (PVT) LTD.',
            employer_epf_no: '65432/B', // Placeholder or from settings if I found them
            data: results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getETFFormR4 = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const payrollsRes = await db.query(`
            SELECT 
                p.*, 
                u.name as employee_name, 
                e.epf_no, 
                e.nic_passport as nic
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            JOIN employees e ON u.id = e.user_id
            WHERE p.month = $1 AND p.status = 'Approved'
            ORDER BY e.epf_no::integer ASC
        `, [month]);

        const payrolls = payrollsRes.rows;
        const results = payrolls.map(p => ({
            member_no: p.epf_no,
            name: p.employee_name,
            nic: p.nic,
            earnings: parseFloat(p.basic_salary),
            contribution_3: parseFloat(p.etf_employer)
        }));

        res.status(200).json({
            month,
            employer_name: 'JAYABIMA INVESTMENTS (PVT) LTD.',
            employer_etf_no: '65432/B',
            data: results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPayrollFinanceExport,
    getStatutoryReport,
    getAuditSummary,
    getPointInTimeHeadcount,
    generatePayslipPDF,
    exportBankCSV,
    getJournalExport,
    getConsolidatedSummary,
    getConsolidatedPayrollReport,
    getEPFFormC,
    getETFFormR4
};
