
const db = require('./backend/config/db');
const { getPendingChanges } = require('./backend/controllers/governance.controller');

async function testController() {
    const req = { user: { id: 1 } };
    const res = {
        status: function (s) {
            console.log('Status:', s);
            return this;
        },
        json: function (j) {
            console.log('JSON:', JSON.stringify(j, null, 2));
        }
    };

    try {
        await getPendingChanges(req, res);
    } catch (err) {
        console.error('Caught Error:', err);
    } finally {
        process.exit(0);
    }
}

testController();
