const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function resetPassword() {
    try {
        const email = 'KRISHANTHA@jayabima.com';
        const newPassword = '123456';

        console.log(`Resetting password for: ${email}`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const res = await pool.query(
            'UPDATE users SET password = $1, force_password_change = TRUE WHERE LOWER(email) = LOWER($2) RETURNING id',
            [hashedPassword, email]
        );

        if (res.rows.length > 0) {
            console.log('Password updated successfully.');
        } else {
            console.log('User not found.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetPassword();
