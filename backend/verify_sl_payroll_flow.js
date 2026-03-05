const { Pool } = require('pg');
process.env.DATABASE_URL = 'postgres://postgres:123456@localhost:5432/hr_db';
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_db',
    password: 'new_password', // Update if changed, assuming standarddev env
    port: 5432,
});
// Override db.pool for the test context if needed, or just use this pool for direct queries
// But controllers use require('../config/db'). We need to mock that or rely on it working if we fix the env.
// The error was SASL password. 
// Let's go with a simpler approach: Just use the connection string directly in the pool.
const db = { pool: new Pool({ connectionString: 'postgres://postgres:123456@localhost:5432/hr_db' }) };

// Create a new file in backend/verify_sl_payroll_flow.js
// We need to import the controllers.
// Note: controllers might use 'req.user' so we need to mock it.

const { createPayroll, reviewPayroll, approvePayroll } = require('./controllers/payroll.controller');
// We might not need to import report controller if we just check DB or hit endpoint URL (but we can't hit URL easily without server running).
// Let's just verify the data generation.

// Mock Request/Response
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
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
    return res;
};

const runVerification = async () => {
    console.log('--- Starting SL Payroll Verification ---');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Test Data
        // Create User
        // Use a random email to avoid collision
        const email = `sltest_${Date.now()}@example.com`;
        const userRes = await client.query(`INSERT INTO users (name, email, password, role) VALUES ('SL Verify', $1, 'hash', 'HR Manager') RETURNING id`, [email]);
        const userId = userRes.rows[0].id;

        // Create Employee
        const empRes = await client.query(`
            INSERT INTO employees (user_id, is_epf_eligible, is_etf_eligible, designation, department) 
            VALUES ($1, TRUE, TRUE, 'VerifyEng', 'Engineering') RETURNING id
        `, [userId]);
        const empId = empRes.rows[0].id;

        // Setup Salary Structure (Basic)
        // Check if Basic component exists
        let basicCompId;
        const basicRes = await client.query("SELECT id FROM salary_components WHERE name ILIKE '%basic%' LIMIT 1");
        if (basicRes.rows.length > 0) {
            basicCompId = basicRes.rows[0].id;
        } else {
            const newBasic = await client.query("INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible) VALUES ('Basic Salary', 'Earning', TRUE, TRUE, TRUE) RETURNING id");
            basicCompId = newBasic.rows[0].id;
        }

        // Insert Basic Salary into Structure
        await client.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, 100000)", [empId, basicCompId]);

        // Check Attendance Schema
        const attSchema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'");
        console.log('Attendance Columns:', attSchema.rows.map(r => r.column_name).join(', '));

        // Insert Attendance with Overtime (10 hours)
        // 2025-06-01
        await client.query(`
            INSERT INTO attendance (employee_id, date, status, clock_in, clock_out, overtime_hours)
            VALUES ($1, '2025-06-01', 'Present', '08:00', '18:00', 10)
        `, [empId]);

        // Check Audit Logs Schema
        const auditSchema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'");
        console.log('Audit Logs Columns:', auditSchema.rows.map(r => r.column_name).join(', '));

        console.log(`-> Test Employee Created (ID: ${empId}, Basic: 100k, OT: 10h)`);

        await client.query('COMMIT'); // Commit so controller can see it

        // 2. Test Payroll Generation
        // Need to simulate req.user
        const req = {
            body: { user_id: userId, month: '2025-06', reauth_token: 'PAYROLL_VERIFIED_SESSION' },
            user: { id: 1, role: 'Admin' } // Acting as Admin
        };
        const res = mockRes();

        // We need to make sure createPayroll awaits everything
        await createPayroll(req, res);

        if (res.statusCode !== 201) {
            console.error('FAILED: createPayroll', res.data);
            throw new Error('Payroll creation failed');
        }

        const payroll = res.data;
        console.log(`-> Payroll Generated (Net: ${payroll.net_salary})`);

        // 3. Verify Calculations
        // Basic: 100,000
        // OT: (100000 / 240) * 1.5 * 10 = 6250
        // Gross: 106,250
        // EPF (8%): 100,000 * 0.08 = 8,000 (OT not eligible)
        // PAYE: Taxable = 106,250 - 8,000 = 98,250.
        // Tax brackets (monthly):
        // 0 - 100,000: 0%
        // > 100,000: 6%
        // Wait, standard tax brackets in SL might be different (e.g. 100k tax free threshold).
        // If 98,250 <= 100,000, Tax should be 0.

        const otItem = payroll.breakdown.find(i => i.name === 'Overtime');
        if (!otItem || Math.abs(otItem.amount - 6250) > 0.1) {
            console.error(`FAILED: OT Calculation. Expected 6250, got ${otItem ? otItem.amount : 'None'}`);
        } else {
            console.log('PASSED: OT Calculation (6250)');
        }

        // Check EPF
        const epfItem = payroll.breakdown.find(i => i.name.includes('EPF (Employee'));
        // EPF is usually calculated on Basic + Budgetary Relief + Liable Allowances.
        // Here just Basic = 100,000. 8% = 8000.
        if (!epfItem || Math.abs(parseFloat(epfItem.amount) - 8000) > 0.1) {
            console.error(`FAILED: EPF Calculation. Expected 8000, got ${epfItem ? epfItem.amount : 'None'}`);
        } else {
            console.log('PASSED: EPF Calculation (8000)');
        }

        // 4. Test Workflow: Review
        const reqReview = { params: { id: payroll.id }, user: { id: 1, role: 'HR Manager' } };
        const resReview = mockRes();
        await reviewPayroll(reqReview, resReview);

        if (resReview.data && resReview.data.status === 'Reviewed') {
            console.log('PASSED: Review Workflow');
        } else {
            console.error('FAILED: Review Workflow', resReview.data);
        }

        // 5. Test Workflow: Approve
        const reqApprove = { params: { id: payroll.id }, user: { id: 1, role: 'Management' } };
        const resApprove = mockRes();
        await approvePayroll(reqApprove, resApprove);

        if (resApprove.data && resApprove.data.status === 'Approved' && resApprove.data.locked) {
            console.log('PASSED: Approve Workflow (Locked)');
        } else {
            console.error('FAILED: Approve Workflow', resApprove.data);
        }

        console.log('--- Verification SUCCESS ---');

        // Cleanup
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        console.log('-> Test Data Cleaned Up');

    } catch (e) {
        console.error('Verification Error:', e);
        // Clean up even on error if possible
        try { await client.query('DELETE FROM users WHERE id = $1', [userId]); } catch { }
    } finally {
        client.release();
        process.exit();
    }
};

runVerification();
