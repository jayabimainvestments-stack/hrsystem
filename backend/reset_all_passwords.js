const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetAllPasswords() {
    try {
        console.log('--- RESETTING ALL PASSWORDS TO 123456 ---');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        // Update all users
        const res = await db.query("UPDATE users SET password = $1 RETURNING email", [hashedPassword]);

        console.log(`✅ Successfully reset passwords for ${res.rowCount} users:`);
        res.rows.forEach(u => console.log(`- ${u.email}`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

resetAllPasswords();
