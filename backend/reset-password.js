const db = require('./config/db');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
    try {
        console.log('Resetting Admin Password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        await db.query(
            "UPDATE users SET password = $1 WHERE email = 'KRISHANTHA@jayabima.com'",
            [hashedPassword]
        );
        console.log('✅ Admin password reset to: 123456');
        process.exit();
    } catch (error) {
        console.error('❌ Failed to reset password:', error);
        process.exit(1);
    }
};

resetAdmin();
