const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testPayslip() {
    try {
        // 1. Login to get token (Use Admin credentials from seed checking or known)
        // Assuming 'admin@example.com' / 'password123' or 'hr@example.com' / 'password123' from standard seed.
        // Let's try HR Manager first.
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'hr@example.com',
            password: '123456'
        });
        const token = loginRes.data.token;
        console.log('Logged in successfully. Token obtained.');

        // 2. Get All Payrolls to find an ID
        const payrollsRes = await axios.get(`${BASE_URL}/payroll`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (payrollsRes.data.length === 0) {
            console.log('No payroll records found.');
            return;
        }

        const payrollId = payrollsRes.data[0].id;
        console.log(`Testing fetch for Payroll ID: ${payrollId}`);

        // 3. Get Payslip Details
        const detailsRes = await axios.get(`${BASE_URL}/payroll/${payrollId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Payslip Details Fetched Successfully:');
        console.log(detailsRes.data);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testPayslip();
