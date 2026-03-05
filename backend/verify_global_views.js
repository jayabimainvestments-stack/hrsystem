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

const verifyGlobalViews = async () => {
    await login();
    if (!token) return;

    try {
        console.log('Testing Global Performance View...');
        const perfRes = await axios.get(`${API_URL}/performance`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${perfRes.data.length} total appraisals`);

        console.log('Testing Global Disciplinary View...');
        const discRes = await axios.get(`${API_URL}/legal/disciplinary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${discRes.data.length} total disciplinary records`);

        console.log('Testing Global Training View...');
        const trainRes = await axios.get(`${API_URL}/legal/training`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success: Found ${trainRes.data.length} total certifications`);

        console.log('All global views verified successfully.');
    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
};

verifyGlobalViews();
