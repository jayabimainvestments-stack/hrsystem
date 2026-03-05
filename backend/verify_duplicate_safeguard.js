const axios = require('axios');

async function verifyDuplicateSafeguard() {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('--- 1. Logging in as Admin ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: '123456'
        });

        const token = loginRes.data.token;
        console.log('Login successful.');

        // Get KRISHANTHA's ID
        const empRes = await axios.get(`${API_URL}/employees`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const krishantha = empRes.data.find(e => e.email === 'KRISHANTHA@jayabima.com');
        if (!krishantha) throw new Error('Krishantha not found');

        console.log('--- 2. Attempting to create DUPLICATE payroll for JANUARY - 2026 ---');
        // JANUARY - 2026 was already imported in previous step
        const payrollData = {
            user_id: krishantha.user_id,
            month: 'JANUARY - 2026',
            reauth_token: 'PAYROLL_VERIFIED_SESSION'
        };

        try {
            await axios.post(`${API_URL}/payroll`, payrollData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.error('FAILURE: Duplicate payroll was allowed!');
        } catch (error) {
            console.log('SUCCESS: Duplicate payroll was BLOCKED.');
            console.log('Response Message:', error.response?.data?.message);
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data?.message || error.message);
    }
}

verifyDuplicateSafeguard();
