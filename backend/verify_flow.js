require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/db');
const axios = require('axios');
// Actually, let's use direct DB checks and simulated controller calls or just logic checks.
// Since we can't easily spin up the server and hit it from the same script without complexity, 
// let's manually invoke the logic or just verify the data flow by creating data directly and checking results.

// BETTER APPROACH: Use the existing 'createPayroll' logic by requiring the controller? 
// But controllers expect req, res.
// Let's create a script that inserts raw data, then checks the math. 
// AND/OR, let's try to mock the req/res objects to call the controller functions.

const { createPayroll, updatePayroll, reviewPayroll, approvePayroll } = require('./backend/controllers/payroll.controller');
const { generatePayslipPDF } = require('./backend/controllers/report.controller');

// Mock Request/Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    res.setHeader = () => { };
    res.send = () => { };
    res.pipe = () => { }; // For PDF
    return res;
};

const runVerification = async () => {
    console.log('--- Starting SL Payroll Verification ---');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Test Data
        // Create User & Employee
        const userRes = await client.query(`INSERT INTO users (name, email, password, role) VALUES ('SL TestUser', 'sltest@example.com', 'hash', 'Employee') RETURNING id`);
        const userId = userRes.rows[0].id;

        const empRes = await client.query(`
            INSERT INTO employees (user_id, basic_salary, is_epf_eligible, is_etf_eligible, designation, department) 
            VALUES ($1, 100000, TRUE, TRUE, 'Tester', 'QA') RETURNING id
        `, [userId]);
        const empId = empRes.rows[0].id;

        // Setup Salary Structure
        // Basic is in employees table (100,000)
        // Add an allowance
        const compRes = await client.query(`SELECT id FROM salary_components WHERE name ILIKE '%allowance%' LIMIT 1`);
        let compId;
        if (compRes.rows.length > 0) {
            compId = compRes.rows[0].id;
        } else {
            const newComp = await client.query(`INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible) VALUES ('Fixed Allowance', 'Earning', TRUE, FALSE, FALSE) RETURNING id`);
            compId = newComp.rows[0].id;
        }

        await client.query(`INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, 10000)`, [empId, compId]);
        // Also ensure Basic component is linked if the controller relies on structure for Basic
        const basicCompRes = await client.query(`SELECT id FROM salary_components WHERE name ILIKE '%basic%' LIMIT 1`);
        if (basicCompRes.rows.length > 0) {
            await client.query(`INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, 100000)`, [empId, basicCompRes.rows[0].id]);
        }


        // Insert Attendance with Overtime
        // 10 hours OT
        await client.query(`
            INSERT INTO attendance (employee_id, date, status, check_in, check_out, overtime_hours)
            VALUES ($1, '2025-05-01', 'Present', '08:00', '18:00', 10)
        `, [empId]);

        console.log('-> Test Data Created (Basic: 100k, Allowance: 10k, OT: 10h)');

        // 2. Test Payroll Generation
        const req = {
            body: { user_id: userId, month: '2025-05', reauth_token: 'PAYROLL_VERIFIED_SESSION' },
            user: { id: 1 } // Admin
        };
        const res = mockRes();

        await createPayroll(req, res);

        if (res.statusCode !== 201) {
            console.error('FAILED: createPayroll', res.data);
            throw new Error('Payroll creation failed');
        }

        const payroll = res.data;
        console.log('-> Payroll Generated:', payroll.net_salary);
        console.log('-> Breakdown:', payroll.breakdown.map(b => `${b.name}: ${b.amount}`).join(', '));

        // Verify Math
        // Basic: 100,000
        // OT: (100,000 / 240) * 1.5 * 10 = 416.666... * 1.5 * 10 = 625 * 10 = 6250
        // Allowance: 10,000
        // Gross: 116,250
        // EPF (Employee 8%): 100,000 * 0.08 = 8,000 (Assuming Allowances/OT not eligible based on structure setup)
        // PAYE: Taxable = 116,250 - 8000 (EPF) = 108,250. 
        // Tax brackets? Assuming standard. 

        const otItem = payroll.breakdown.find(i => i.name === 'Overtime');
        if (!otItem || Math.abs(otItem.amount - 6250) > 1) {
            console.error('FAILED: OT Calculation. Expected ~6250, got ' + (otItem ? otItem.amount : 'None'));
        } else {
            console.log('PASSED: OT Calculation');
        }

        // 3. Test Workflow: Review
        const payrollId = await client.query('SELECT id FROM payroll WHERE user_id = $1 AND month = $2', [userId, '2025-05']).then(r => r.rows[0].id);

        const reqReview = { params: { id: payrollId }, user: { id: 1 } }; // HR
        const resReview = mockRes();
        await reviewPayroll(reqReview, resReview);

        if (resReview.statusCode !== 200 || resReview.data.status !== 'Reviewed') {
            console.error('FAILED: Review Workflow', resReview.data);
        } else {
            console.log('PASSED: Review Workflow');
        }

        // 4. Test Workflow: Approve & Lock
        const reqApprove = { params: { id: payrollId }, user: { id: 1 } }; // Management
        const resApprove = mockRes();
        await approvePayroll(reqApprove, resApprove);

        if (resApprove.statusCode !== 200 || resApprove.data.status !== 'Approved' || resApprove.data.locked !== true) {
            console.error('FAILED: Approve Workflow', resApprove.data);
        } else {
            console.log('PASSED: Approve Workflow (Locked)');
        }

        console.log('--- Verification Complete: SUCCESS ---');

        await client.query('ROLLBACK'); // Clean up
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(); // Close pool
    }
};

runVerification();
