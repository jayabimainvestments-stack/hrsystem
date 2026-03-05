const db = require('./config/db');

const listUsers = async () => {
    try {
        const users = await db.query("SELECT id, name, email FROM users");
        console.table(users.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listUsers();
