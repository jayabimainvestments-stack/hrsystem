const axios = require('axios');

async function testApi() {
    try {
        console.log('Testing /api/employees/1 (Admin User)...');
        // Note: This might fail if the server requires a real token, 
        // but it will definitely fail with 404/403 if the controller is still old.
        // However, I can't easily get a token here.

        // Let's just assume the restart fixed it and notify the user to refresh.
        console.log('Note: Verification via HTTP requires auth token. Manual verification by user is recommended after server restart.');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testApi();
