const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createTestEmployee() {
    try {
        const email = 'temp_emp_verify@test.com';
        const password = 'password123';

        // 1. Delete if exists
        await db.query("DELETE FROM users WHERE email = $1", [email]);

        // 2. Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRes = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ('Test Employee', $1, $2, 'Employee') RETURNING id",
            [email, hashedPassword]
        );
        const userId = userRes.rows[0].id;

        // 3. Create employee profile (needed for leaving constraints sometimes)
        await db.query(
            "INSERT INTO employees (user_id, nic_passport, designation, department, hire_date) VALUES ($1, 'TEST12345', 'Tester', 'IT', '2023-01-01')",
            [userId]
        );

        console.log(`✅ Created test employee: ${email} / ${password} (ID: ${userId})`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestEmployee();
