const axios = require('axios');

async function testApi() {
    try {
        console.log('Testing GET /api/attendance...');
        // We need a token. I'll steal one from logs if possible or just assume it fails with 401.
        // But I want to see if the server CRASHES or returns 500.
        const res = await axios.get('http://localhost:5000/api/attendance', {
            params: { date: '2026-02-15' }
        });
        console.log('Status:', res.status);
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Body:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testApi();
