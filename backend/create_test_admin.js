const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createTestAdmin() {
    try {
        const email = 'temp_admin_verify@test.com';
        const password = 'password123';

        // 1. Delete if exists
        await db.query("DELETE FROM users WHERE email = $1", [email]);

        // 2. Create new
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ('Test Admin', $1, $2, 'Admin')",
            [email, hashedPassword]
        );

        console.log(`✅ Created test user: ${email} / ${password}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestAdmin();
