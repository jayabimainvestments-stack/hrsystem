const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@example.com';
const PASSWORD = '123456';

async function run() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error(await loginRes.text());
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   Success! Token received.');

        console.log('2. Posting a new Job...');
        const jobRes = await fetch(`${API_URL}/recruitment/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Software Engineer',
                department: 'Engineering',
                description: 'Test Description',
                requirements: 'Node.js',
                type: 'Full-Time',
                location: 'Remote',
                status: 'Open'
            })
        });

        if (!jobRes.ok) throw new Error(await jobRes.text());
        const jobData = await jobRes.json();
        const jobId = jobData.id;
        console.log(`   Success! Job ID: ${jobId}`);

        console.log('3. Fetching Jobs (Public)...');
        const jobsRes = await fetch(`${API_URL}/recruitment/jobs`);
        if (!jobsRes.ok) throw new Error(await jobsRes.text());
        const jobsData = await jobsRes.json();
        const job = jobsData.find(j => j.id === jobId);
        if (!job) throw new Error('Job not found in public list');
        console.log('   Success! Job found in list.');

        console.log('4. Applying for Job...');
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('name', 'Test Candidate');
        formData.append('email', `test${Date.now()}@candidate.com`);
        formData.append('phone', '0771234567');

        const applyRes = await fetch(`${API_URL}/recruitment/apply`, {
            method: 'POST',
            body: formData
        });

        if (!applyRes.ok) {
            const txt = await applyRes.text();
            throw new Error(`Apply failed: ${txt}`);
        }
        console.log('   Success! Application submitted.');

        console.log('5. Viewing Applications (Admin)...');
        const appsRes = await fetch(`${API_URL}/recruitment/applications/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!appsRes.ok) throw new Error(await appsRes.text());
        const appsData = await appsRes.json();

        if (appsData.length === 0) throw new Error('No applications found');
        const appId = appsData[0].id;
        console.log(`   Success! Application ID: ${appId} found.`);

        console.log('6. Updating Application Status...');
        const updateRes = await fetch(`${API_URL}/recruitment/applications/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Hired' })
        });

        if (!updateRes.ok) throw new Error(await updateRes.text());
        console.log('   Success! Status updated to Hired.');

        console.log('--- ALL TESTS PASSED ---');

    } catch (error) {
        console.error('FAILED:', error.message);
    }
}

run();
