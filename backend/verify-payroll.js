// Configuration
const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let employeeId = ''; // User ID of an employee
let payrollId = '';

// Helper for fetch
async function request(url, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({})); // Handle empty response

    if (!res.ok) {
        const error = new Error(data.message || res.statusText);
        error.response = { status: res.status, data };
        throw error;
    }

    return data;
}

// Login as Admin
async function login() {
    try {
        const data = await request(`${API_URL}/auth/login`, 'POST', {
            email: 'admin@example.com', // Assuming default admin
            password: '123456'
        });
        adminToken = data.token;
        console.log('✅ Login successful');
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Get an Employee
async function getEmployee() {
    try {
        const data = await request(`${API_URL}/employees`, 'GET', null, adminToken);
        if (data.length > 0) {
            employeeId = data[0].user_id;
            console.log(`✅ Found employee: ${data[0].name} (User ID: ${employeeId})`);
        } else {
            console.error('❌ No employees found');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Failed to get employees:', error.message);
    }
}

// 1. Create Payroll (Initial)
async function createPayroll() {
    try {
        const month = '2025-12'; // Future month to avoid conflict with seeded data

        console.log(`Testing Create Payroll for ${month}...`);

        try {
            const res = await request(`${API_URL}/payroll`, 'POST', {
                user_id: employeeId,
                month: month,
                breakdown: [
                    { name: 'Basic Salary', amount: 5000, type: 'Earning' },
                    { name: 'Allowances', amount: 1000, type: 'Earning' },
                    { name: 'EPF (Employee)', amount: 400, type: 'Statutory' }, // 8%
                    { name: 'EPF (Employer)', amount: 600, type: 'Statutory' }, // 12%
                    { name: 'ETF (Employer)', amount: 150, type: 'Statutory' }, // 3%
                    { name: 'Welfare', amount: 100, type: 'Deduction' }
                ]
            }, adminToken);
            console.log('✅ Payroll Created Successfully');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('⚠️ Payroll already exists (from previous run?), skipping creation.');
            } else {
                throw e;
            }
        }

        // Fetch to get ID
        const list = await request(`${API_URL}/payroll`, 'GET', null, adminToken);
        const record = list.find(p => p.user_id === employeeId && p.month === month);
        if (record) {
            payrollId = record.id;
            console.log(`✅ Retrieved Payroll ID: ${payrollId}`);
        } else {
            console.error('❌ Could not retrieve created payroll record');
        }

    } catch (error) {
        console.error('❌ Create Payroll Failed:', error.response?.data || error.message);
    }
}

// 2. Test Duplicate
async function testDuplicate() {
    try {
        console.log('Testing Duplicate Prevention...');
        const month = '2025-12';
        await request(`${API_URL}/payroll`, 'POST', {
            user_id: employeeId,
            month: month,
            breakdown: []
        }, adminToken);
        console.error('❌ Duplicate check FAILED (Should have returned 400)');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Duplicate check PASSED (Returned 400)');
        } else {
            console.error('❌ Duplicate check failed with unexpected error:', error.message);
        }
    }
}

// 3. Test Liablities (Check if created)
async function checkLiabilities() {
    try {
        console.log('Checking Liabilities...');
        const data = await request(`${API_URL}/payroll/liabilities`, 'GET', null, adminToken);

        const month = '2025-12';
        const welfare = data.find(l => l.month === month && l.type === 'Welfare');
        const epf = data.find(l => l.month === month && l.type === 'EPF');

        if (welfare && parseFloat(welfare.total_payable) >= 100) {
            console.log(`✅ Welfare Liability tracked: ${welfare.total_payable}`);
        } else {
            console.error(`❌ Welfare Liability mismatch. Expected >= 100, got ${welfare?.total_payable}`);
        }

        if (epf && parseFloat(epf.total_payable) >= 1000) { // 400 + 600
            console.log(`✅ EPF Liability tracked: ${epf.total_payable}`);
        } else {
            console.error(`❌ EPF Liability mismatch. Expected >= 1000, got ${epf?.total_payable}`);
        }

    } catch (error) {
        console.error('❌ Check Liabilities Failed:', error.message);
    }
}

// 4. Test Correction
async function testCorrection() {
    if (!payrollId) return;
    try {
        console.log('Testing Correction (Update)...');
        // Increase Welfare by 50 (Total 150)
        // Increase EPF Employer by 100 (Total 700 + 400 = 1100)

        await request(`${API_URL}/payroll/${payrollId}`, 'PUT', {
            breakdown: [
                { name: 'Basic Salary', amount: 5000, type: 'Earning' },
                { name: 'Allowances', amount: 1000, type: 'Earning' },
                { name: 'EPF (Employee)', amount: 400, type: 'Deduction' },
                { name: 'EPF (Employer)', amount: 700, type: 'Statutory' },
                { name: 'ETF (Employer)', amount: 150, type: 'Statutory' },
                { name: 'Welfare', amount: 150, type: 'Deduction' }
            ]
        }, adminToken);
        console.log('✅ Payroll Updated Successfully');

        // Check Liabilities again
        const data = await request(`${API_URL}/payroll/liabilities`, 'GET', null, adminToken);
        const month = '2025-12';
        const welfare = data.find(l => l.month === month && l.type === 'Welfare');
        const epf = data.find(l => l.month === month && l.type === 'EPF');

        if (welfare && parseFloat(welfare.total_payable) === 150) {
            console.log('✅ Welfare Liability updated correctly (150)');
        } else {
            console.error(`❌ Welfare Liability Update mismatch. Expected 150, got ${welfare?.total_payable}`);
        }

        if (epf && parseFloat(epf.total_payable) === 1100) {
            console.log('✅ EPF Liability updated correctly (1100)');
        } else {
            console.error(`❌ EPF Liability Update mismatch. Expected 1100, got ${epf?.total_payable}`);
        }

    } catch (error) {
        console.error('❌ Correction verification failed:', error.response?.data || error.message);
    }
}

async function run() {
    await login();
    await getEmployee();
    await createPayroll();
    await testDuplicate();
    await checkLiabilities();
    await testCorrection();
}

run();
