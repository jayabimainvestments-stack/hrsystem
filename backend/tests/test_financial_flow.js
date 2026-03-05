const db = require('../config/db');
const { actOnPendingChange } = require('../controllers/governance.controller');
const { submitRequest } = require('../controllers/financial.controller');

// Mock Request/Response
const mockReq = (body, user) => ({
    body,
    user,
    params: {}
});

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
    return res;
};

async function testFinancialFlow() {
    console.log('--- TEST: Financial Request Flow ---');

    // 1. Setup Data
    // Need an employee and admin
    const adminRes = await db.query("SELECT id FROM users WHERE role = 'Admin' LIMIT 1");
    const empRes = await db.query("SELECT id FROM employees LIMIT 1");

    if (adminRes.rows.length === 0 || empRes.rows.length === 0) {
        console.error('❌ Skipping test: No Admin or Employee found');
        return;
    }

    const adminId = adminRes.rows[0].id;
    const employeeId = empRes.rows[0].id;

    console.log(`Using Admin: ${adminId}, Employee: ${employeeId}`);

    try {
        // 2. Submit Request
        console.log('Step 1: Submitting Financial Request...');
        const reqData = {
            month: '2025-05',
            type: 'Fuel Allowance',
            data: [{ employee_id: employeeId, liters: 50, amount: 25000 }]
        };

        const submitReq = mockReq(reqData, { id: adminId }); // Admin submitting for someone else? Or separate user?
        // Let's assume Admin submits it.
        const submitRes = mockRes();

        await submitRequest(submitReq, submitRes);

        if (submitRes.statusCode !== 201) {
            throw new Error(`Submit failed: ${JSON.stringify(submitRes.data)}`);
        }
        const requestId = submitRes.data.id;
        console.log('✅ Request Submitted. ID:', requestId);

        // 3. Approve via Governance (Simulate Admin Approval)
        console.log('Step 2: Approving via Governance...');
        const actReq = mockReq({
            id: requestId,
            action: 'Approve',
            type: 'FINANCIAL'
        }, { id: adminId, role: 'Admin' });

        const actRes = mockRes();
        await actOnPendingChange(actReq, actRes);

        if (actRes.statusCode !== 200) {
            throw new Error(`Approval failed: ${JSON.stringify(actRes.data)}`);
        }
        console.log('✅ Request Approved via Governance');

        // 4. Verify Salary Structure Update
        console.log('Step 3: Verifying Salary Structure...');
        // Need to find the component ID for 'Fuel Allowance'
        const compRes = await db.query("SELECT id FROM salary_components WHERE name ILIKE '%Fuel%' LIMIT 1");
        const compId = compRes.rows[0].id;

        const structCheck = await db.query(
            'SELECT * FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
            [employeeId, compId]
        );

        if (structCheck.rows.length > 0) {
            const entry = structCheck.rows[0];
            if (parseFloat(entry.amount) === 25000 && entry.is_locked) {
                console.log('✅ Salary Structure Updated & Locked Correctly');
            } else {
                console.error('❌ Data Mismatch:', entry);
                throw new Error('Salary structure data mismatch');
            }
        } else {
            throw new Error('Salary structure record not found');
        }

        // Cleanup
        await db.query('DELETE FROM financial_requests WHERE id = $1', [requestId]);
        // Ideally revert salary structure too, but complex.
        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testFinancialFlow();
