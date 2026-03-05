const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// Helper - Draw Line
const drawLine = (doc, y) => {
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
};

// @desc    Generate PDF Payslip
// @route   GET /api/reports/payroll/:id/pdf
// @access  Private
const generatePayslipPDF = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch Data (Reusing logic from payroll logic)
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
        doc.text(`ID: ${employee.employee_id}`, 300, doc.y - 12); // Same line
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
        doc.fontSize(12).text('Earnings', { underline: true });
        doc.fontSize(10);
        doc.moveDown();
        let earningY = doc.y;

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
        doc.text((parseFloat(payroll.allowances) + basicSalary).toFixed(2), 200, doc.y - 12, { align: 'right', width: 100 });
        doc.font('Helvetica');

        // Deductions
        doc.y = earningY; // Reset Y for right column? No, let's just do sequential for simplicity or columns.
        // Let's do Deductions below for safety.

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

        // Footer
        doc.moveDown();
        doc.moveDown();
        doc.text('This is a system generated payslip.', { align: 'center', color: 'gray' });

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
};

// @desc    Export Bank Transfer List (CSV)
// @route   GET /api/reports/payroll/export/bank
// @access  Private (Admin/Finance)
const exportBankCSV = async (req, res) => {
    const { month } = req.query; // Format YYYY-MM
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

module.exports = {
    generatePayslipPDF,
    exportBankCSV
};
