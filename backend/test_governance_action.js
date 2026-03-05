const { actOnPendingChange } = require('./controllers/governance.controller');
const db = require('./config/db');

// Test Case: Approve a Performance Override (ID 34)
const mockReq = {
    user: { id: 1, role: 'Admin' },
    body: {
        id: 34,
        action: 'Approve',
        approval_reason: 'Test Approval',
        type: 'PERFORMANCE'
    }
};

const mockRes = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: async function (data) {
        console.log('--- Response Data ---');
        console.log(data);

        // Verify in DB
        const res = await db.query('SELECT status FROM monthly_salary_overrides WHERE id = 34');
        console.log('Final Status in DB:', res.rows[0].status);

        process.exit(0);
    }
};

actOnPendingChange(mockReq, mockRes);
