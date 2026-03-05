const db = require('./config/db');

async function removeTestEmployee() {
    try {
        const email = 'temp_emp_verify@test.com';

        // get user id
        const userRes = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;
            await db.query("DELETE FROM audit_logs WHERE user_id = $1", [userId]);
            await db.query("DELETE FROM employees WHERE user_id = $1", [userId]);
            await db.query("DELETE FROM users WHERE id = $1", [userId]);
            console.log(`✅ Removed test user: ${email} (ID: ${userId})`);
        } else {
            console.log(`User ${email} not found.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeTestEmployee();
