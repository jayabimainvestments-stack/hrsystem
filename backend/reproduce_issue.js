const fetch = globalThis.fetch;

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: '123456' }),
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        }

        const loginData = await loginRes.json();
        console.log('Login successful. Token:', loginData.token ? 'Yes' : 'No');

        // 2. Fetch Employees
        console.log('Fetching employees...');
        const empRes = await fetch('http://localhost:5000/api/employees', {
            headers: { Authorization: `Bearer ${loginData.token}` },
        });

        if (!empRes.ok) {
            throw new Error(`Fetch employees failed: ${empRes.status} ${await empRes.text()}`);
        }

        const employees = await empRes.json();
        console.log('Employeesfetched:', employees.length);
        console.log(JSON.stringify(employees, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

run();
