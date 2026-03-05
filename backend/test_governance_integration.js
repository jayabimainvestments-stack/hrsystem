const { getPendingChanges } = require('./controllers/governance.controller');
const db = require('./config/db');

const mockReq = {
    user: { id: 1, role: 'Admin' }
};

const mockRes = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        this.data = data;
        console.log('--- Response Data ---');
        const performance = data.filter(d => d.type === 'PERFORMANCE');
        console.log(`Found ${performance.length} Performance requests`);
        if (performance.length > 0) {
            console.log('First one:', JSON.stringify(performance[0], null, 2));
        }
        process.exit(0);
    }
};

getPendingChanges(mockReq, mockRes);
