const axios = require('axios');

async function verifyFix() {
    try {
        console.log('--- VERIFYING API FIX ON RUNNING SERVER ---');

        // 1. Login
        // Try common credentials from seed data or previous logs
        // admin@jayabima.com is what I saw in debug output for leaves
        // Let's try to find the admin user's email first
        // or just try the one from reproduce_login.js: admin@example.com

        let token;

        try {
            console.log('Attempting login with temp_emp_verify@test.com...');
            const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'temp_emp_verify@test.com',
                password: 'password123'
            });
            token = loginRes.data.token;
            console.log('Login successful!');
        } catch (e) {
            console.error('Login failed.');
            process.exit(1);
        }

        // 2. Get My Leaves
        console.log('Fetching /api/leaves/my...');
        const leavesRes = await axios.get('http://localhost:5000/api/leaves/my', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const leaves = leavesRes.data;
        if (leaves.length === 0) {
            console.log('No leaves found for this user. Cannot verify.');

            console.log('Fetching leave types...');
            const typesRes = await axios.get('http://localhost:5000/api/leaves/types', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const typeId = typesRes.data[0].id;
            console.log('Using leave type ID:', typeId);

            console.log('Creating a test leave...');
            await axios.post('http://localhost:5000/api/leaves', {
                leave_type_id: typeId,
                start_date: '2026-03-01',
                end_date: '2026-03-01',
                reason: 'Verification Test Leave'
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Fetch again
            const retryRes = await axios.get('http://localhost:5000/api/leaves/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            leaves.push(...retryRes.data);
        }

        if (leaves.length > 0) {
            const firstLeave = leaves[0];
            console.log('\nFirst Leave Record Keys:', Object.keys(firstLeave));
            console.log('employee_name:', firstLeave.employee_name);
            console.log('approved_by_name:', firstLeave.approved_by_name);

            if (firstLeave.employee_name && firstLeave.approved_by_name !== undefined) {
                console.log('\n✅ SUCCESS: Fields are present.');
            } else {
                console.log('\n❌ FAIL: Fields are MISSING in /api/leaves/my response.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

verifyFix();
