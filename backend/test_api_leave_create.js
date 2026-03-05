const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testLeaveTypeCreation() {
    try {
        console.log('Logging in as Admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'KRISHANTHA@jayabima.com',
            password: '123456' // Updated based on previous learnings
        });

        if (loginRes.status === 200) {
            const token = loginRes.data.token;
            console.log('Login successful. Token acquired.');

            console.log('Creating Leave Type...');
            const leaveType = {
                name: 'TEST_LEAVE_PROTOCOL',
                is_paid: true,
                annual_limit: 15
            };

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const createRes = await axios.post(`${BASE_URL}/leaves/types`, leaveType, config);
            console.log('Response:', createRes.data);
            console.log('SUCCESS: Leave Type Created.');
        }

    } catch (error) {
        if (error.response) {
            console.error('FAILED:', error.response.status, error.response.data);
        } else {
            console.error('ERROR:', error.message);
        }
    }
}

testLeaveTypeCreation();
