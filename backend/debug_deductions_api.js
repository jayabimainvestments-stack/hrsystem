const axios = require('axios');
const path = require('path');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';

async function testDeductions() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'hr_manager_verify@test.com', // Using a known HR account
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log("   Logged in.");

        console.log("2. Fetching Manual Deductions for 2026-02...");
        const res = await axios.get(`${API_URL}/manual-deductions?month=2026-02`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Success! Data:", JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error("❌ Error:");
        if (e.response) {
            console.error(`   Status: ${e.response.status}`);
            console.error(`   Data:`, e.response.data);
        } else {
            console.error(`   Message: ${e.message}`);
        }
    }
}

testDeductions();
