const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
let token;
let employeeId;
let deductionId;

async function runTest() {
    console.log("=== STARTING MANUAL DEDUCTION WORKFLOW TEST ===");

    try {
        console.log("0. Checking server health...");
        try {
            const health = await axios.get(`${API_URL.replace('/api', '/')}`);
            console.log("✅ Server says:", health.data);
        } catch (e) {
            console.log("❌ Server root check failed:", e.message);
        }

        // 1. Login
        console.log("\n1. Logging in as Admin...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'temp_admin_verify@test.com',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log("✅ Login successful.");

        // 2. Get Employees for Deduction
        console.log("\n2. Fetching deduction list...");
        const month = new Date().toISOString().slice(0, 7);
        const listRes = await axios.get(`${API_URL}/manual-deductions?month=${month}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (listRes.data.length === 0) throw new Error("No employees found.");

        const emp = listRes.data[0];
        employeeId = emp.employee_id;
        console.log(`✅ Found employee: ${emp.employee_name} (ID: ${employeeId})`);

        // 3. Save Deduction
        console.log("\n3. Saving deduction (1 Day)...");
        const saveRes = await axios.post(`${API_URL}/manual-deductions`, {
            employee_id: employeeId,
            month: month,
            deduct_days: 1,
            deduct_hours: 0,
            reason: "Test Deduction"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        deductionId = saveRes.data.id;
        console.log(`✅ Saved deduction (ID: ${deductionId}). Amount: ${saveRes.data.total_amount}`);

        // 4. Approve Level 1
        console.log("\n4. Approving Level 1...");
        await axios.post(`${API_URL}/manual-deductions/${deductionId}/approve`, {
            level: 1
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Level 1 Approved.");

        // 5. Approve Level 2 (Must be different user)
        console.log("\n5. Creating Second Admin for Level 2 Approval...");
        // Create second admin
        const secondAdminEmail = 'hr_manager_verify@test.com';
        await axios.post(`${API_URL}/auth/register`, { // Assuming register route exists or I insert directly. 
            // Wait, register might be protected or non-existent for admins. 
            // Better to insert directly into DB using pool.
        }).catch(() => { }); // This is tricky if no register route.

        // Let's insert directly using pool
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash('password123', salt);

        await pool.query("DELETE FROM users WHERE email = $1", [secondAdminEmail]);
        await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ('HR Manager Test', $1, $2, 'HR Manager')",
            [secondAdminEmail, secPass]
        );

        console.log("   Logging in as Second Admin...");
        const loginRes2 = await axios.post(`${API_URL}/auth/login`, {
            email: secondAdminEmail,
            password: 'password123'
        });
        const token2 = loginRes2.data.token;

        console.log("   Approving Level 2...");
        await axios.post(`${API_URL}/manual-deductions/${deductionId}/approve`, {
            level: 2
        }, {
            headers: { Authorization: `Bearer ${token2}` }
        });
        console.log("✅ Level 2 Approved & Processed.");

        // Clean up second user
        await pool.query("DELETE FROM users WHERE email = $1", [secondAdminEmail]);
        await pool.end();

        // 6. Verify Database (Salary Structure)
        console.log("\n6. Verifying Salary Structure update...");
        // Reuse existing pool from step 5, or create if closed (but we didn't close it effectively in step 5 yet)
        // Actually I closed it in step 5 with await pool.end(); 
        // So I need to create a NEW one or not close it in step 5.
        // Let's create a new one but use a different variable name to be safe or just use pool2
        const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
        const salaryRes = await pool2.query(`
            SELECT ess.amount, sc.name 
            FROM employee_salary_structure ess
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE ess.employee_id = $1 AND sc.name = 'No Pay'
        `, [employeeId]);

        if (salaryRes.rows.length > 0) {
            console.log(`✅ Found 'No Pay' component value: ${salaryRes.rows[0].amount}`);
        } else {
            console.log("❌ 'No Pay' component NOT found in salary structure!");
        }
        await pool2.end();

    } catch (error) {
        console.error("❌ Test Failed:", error.response ? error.response.data : error.message);
    }
}

runTest();
