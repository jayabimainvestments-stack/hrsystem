const axios = require('axios');

async function testUpdate() {
    try {
        console.log('Fetching current policy...');
        const getRes = await axios.get('http://localhost:5000/api/attendance/policy');
        console.log('Current absent_day_amount:', getRes.data.absent_day_amount);

        console.log('\nUpdating policy with absent_day_amount = 2500...');
        const updateRes = await axios.put('http://localhost:5000/api/attendance/policy', {
            ...getRes.data,
            absent_day_amount: 2500
        });
        console.log('Update Result:', updateRes.data.absent_day_amount);

        console.log('\nRetrying GET to verify persistence...');
        const verifyRes = await axios.get('http://localhost:5000/api/attendance/policy');
        console.log('Verified absent_day_amount:', verifyRes.data.absent_day_amount);

        if (verifyRes.data.absent_day_amount == 2500) {
            console.log('\nTEST SUCCESSFUL');
        } else {
            console.log('\nTEST FAILED: Value not persisted');
        }
    } catch (err) {
        console.error('Test failed with error:', err.message);
        if (err.response) console.error('Response data:', err.response.data);
    }
}

testUpdate();
