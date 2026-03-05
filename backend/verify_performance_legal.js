const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: '123456'
        });
        token = res.data.token;
        console.log('Logged in successfully');
    } catch (error) {
        console.error('Login failed');
    }
};

const verifyEndpoints = async () => {
    await login();
    if (!token) return;

    try {
        console.log('Testing GET /api/performance...');
        const perfRes = await axios.get(`${API_URL}/performance`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${perfRes.data.length} appraisals`);

        console.log('Testing GET /api/legal/disciplinary/1...');
        const discRes = await axios.get(`${API_URL}/legal/disciplinary/1`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${discRes.data.length} disciplinary records`);

        console.log('Testing GET /api/legal/training/1...');
        const trainRes = await axios.get(`${API_URL}/legal/training/1`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${trainRes.data.length} training certifications`);

        console.log('All endpoints verified successfully.');
    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
};

verifyEndpoints();
