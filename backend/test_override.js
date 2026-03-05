const axios = require('axios');

async function testOverride() {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('--- 1. Logging in as Admin ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: '123456'
        });
        const token = loginRes.data.token;

        // 2. Get Employees
        const empRes = await axios.get(`${API_URL}/employees`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const krishantha = empRes.data.find(e => e.email === 'KRISHANTHA@jayabima.com');
        const empId = krishantha.id;
        console.log(`Testing for Employee: ${krishantha.name} (ID: ${empId})`);

        // 3. Get Components
        const compRes = await axios.get(`${API_URL}/payroll-settings/components`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const basicComp = compRes.data.find(c => c.name.toLowerCase().includes('basic'));
        if (!basicComp) throw new Error('Basic Pay component not found');
        console.log(`Found Basic Comp ID: ${basicComp.id}`);

        // 4. Update Structure
        console.log('--- 3. Updating Salary Structure ---');
        const payload = {
            employee_id: empId,
            components: [
                { component_id: basicComp.id, amount: 50000 }
            ]
        };

        const updateRes = await axios.post(`${API_URL}/payroll-settings/structure`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update response:', updateRes.data.message);

        // 5. Verify Structure
        console.log('--- 4. Verifying Saved Structure ---');
        const verifyRes = await axios.get(`${API_URL}/payroll-settings/structure/${empId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Saved Structure:', JSON.stringify(verifyRes.data));

        const savedBasic = verifyRes.data.find(d => d.component_id === basicComp.id);
        if (savedBasic && parseFloat(savedBasic.amount) === 50000) {
            console.log('SUCCESS: Structure saved and verified.');
        } else {
            console.error('FAILURE: Structure mismatch or not saved!');
        }

    } catch (error) {
        console.error('Test failed:', error.response?.data?.message || error.message);
    }
}

testOverride();
