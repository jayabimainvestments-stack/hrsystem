const axios = require('axios');
const db = require('./config/db');

const BASE_URL = 'http://localhost:5000/api';

async function testLeaveRequest() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'KRISHANTHA@jayabima.com',
            password: '123456'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        // 2. Get Leave Types
        console.log('Fetching leave types...');
        const typeRes = await axios.get(`${BASE_URL}/leaves/types`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (typeRes.data.length === 0) {
            console.error('No leave types found! Create one first.');
            return;
        }

        const leaveType = typeRes.data[0];
        console.log(`Using Leave Type: ${leaveType.name} (ID: ${leaveType.id})`);

        // 3. Create Leave Request
        const leaveRequest = {
            leave_type_id: leaveType.id,
            start_date: '2026-03-10',
            end_date: '2026-03-12',
            reason: 'Test Leave Request from Script'
        };

        console.log('Submitting Leave Request:', leaveRequest);
        const reqRes = await axios.post(`${BASE_URL}/leaves`, leaveRequest, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('SUCCESS: Leave Request Created.');
        console.log('Response:', reqRes.data);

    } catch (error) {
        if (error.response) {
            console.error('FAILED:', error.response.status, error.response.data);
        } else {
            console.error('ERROR:', error.message);
        }
    }
}

testLeaveRequest();
