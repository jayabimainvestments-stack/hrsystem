const db = require('./config/db');

async function removeHrManager() {
    try {
        const email = 'hr@example.com';
        console.log(`--- REMOVING HR MANAGER [${email}] ---`);

        // Get user ID
        const res = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (res.rows.length === 0) {
            console.log('User not found.');
            process.exit(0);
        }
        const userId = res.rows[0].id;
        console.log(`Found User ID: ${userId}`);

        // Delete dependencies
        await db.query("DELETE FROM audit_logs WHERE user_id = $1", [userId]);
        console.log('Deleted from [audit_logs]');

        await db.query("DELETE FROM employees WHERE user_id = $1", [userId]);
        console.log('Deleted from [employees]');

        await db.query("DELETE FROM leave_balances WHERE user_id = $1", [userId]);
        console.log('Deleted from [leave_balances]');

        await db.query("DELETE FROM leaves WHERE user_id = $1", [userId]); // Just in case, though we wiped leaves earlier
        console.log('Deleted from [leaves]');

        // Delete user
        await db.query("DELETE FROM users WHERE id = $1", [userId]);
        console.log('✅ Deleted user from [users]');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeHrManager();
