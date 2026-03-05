const db = require('./config/db');
const bcrypt = require('bcryptjs');

(async () => {
    try {
        const u = await db.query("SELECT id, email, password FROM users WHERE role = 'Admin'");
        for (const user of u.rows) {
            for (const pwd of ['123456', 'admin123', 'Admin123', 'password', 'admin']) {
                const match = await bcrypt.compare(pwd, user.password);
                if (match) console.log(`✓ ${user.email} password: ${pwd}`);
            }
        }
    } catch (e) { console.log(e.message); }
    finally { process.exit(); }
})();
