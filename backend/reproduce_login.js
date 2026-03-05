const axios = require('axios');

const testLogin = async (email, password) => {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email,
            password
        });
        console.log('Login successful for:', email);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Login failed for:', email);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

const runTests = async () => {
    console.log('--- Testing Admin Login ---');
    await testLogin('admin@example.com', '123456');

    console.log('\n--- Testing Krishantha Login ---');
    await testLogin('krishantha@example.com', '123456'); // assuming same password or common one
};

runTests();
