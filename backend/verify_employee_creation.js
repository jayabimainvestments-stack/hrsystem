const axios = require('axios');

async function verifyEmployeeCreation() {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('--- 1. Logging in as Admin ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: '123456'
        });

        const token = loginRes.data.token;
        console.log('Login successful.');

        console.log('--- 2. Creating first employee ---');
        const employeeData = {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            role: 'Employee',
            nic_passport: '123456789V',
            designation: 'System Administrator',
            department: 'Management',
            hire_date: new Date().toISOString().split('T')[0],
            phone: '0712345678',
            address: '123 Main St, Colombo',
            is_epf_eligible: true,
            is_etf_eligible: true,
            dob: '1990-01-01',
            gender: 'Male',
            marital_status: 'Single',
            bank_details: {
                bank_name: 'Commercial Bank',
                branch_code: '001',
                account_number: '1234567890',
                account_holder_name: 'John Doe'
            },
            emergency_contact: {
                name: 'Jane Doe',
                relation: 'Spouse',
                phone: '0777654321'
            }
        };

        const createRes = await axios.post(`${API_URL}/employees`, employeeData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Employee creation response:', createRes.data.message);

        console.log('--- 3. Verifying employee appears in list ---');
        const listRes = await axios.get(`${API_URL}/employees`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const john = listRes.data.find(e => e.email === 'john@example.com');
        if (john) {
            console.log('SUCCESS: John Doe found in employee list.');
            console.log('Employee ID:', john.id);
        } else {
            console.error('FAILURE: John Doe not found in employee list.');
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data?.message || error.message);
    }
}

verifyEmployeeCreation();
