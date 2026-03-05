const db = require('./config/db');
const bcrypt = require('bcryptjs');

const resetPass = async () => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        await db.query(
            "UPDATE users SET password = $1 WHERE email = 'employee@example.com'",
            [hashedPassword]
        );
        console.log('Password for employee@example.com reset to 123456');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

resetPass();
