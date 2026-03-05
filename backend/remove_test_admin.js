const db = require('./config/db');

async function removeTestAdmin() {
    try {
        const email = 'temp_admin_verify@test.com';
        await db.query("DELETE FROM users WHERE email = $1", [email]);
        console.log(`✅ Removed test user: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeTestAdmin();
