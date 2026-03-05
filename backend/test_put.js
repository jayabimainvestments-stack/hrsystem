const axios = require('axios');

async function testUpdate() {
    try {
        console.log('Sending PUT request to update policy...');
        const res = await axios.put('http://localhost:5000/api/attendance/policy', {
            absent_day_amount: '2500',
            late_hourly_rate: '1800'
        }, {
            headers: {
                // We might need a token if it's protected, but let's see if we can get an error at least
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
testUpdate();
