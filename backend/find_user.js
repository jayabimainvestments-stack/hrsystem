const db = require('./config/db');

const findUser = async () => {
    try {
        const res = await db.query("SELECT id, name, email FROM users WHERE name ILIKE '%Jone Doe%'");
        console.log('Users found:', res.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

findUser();
