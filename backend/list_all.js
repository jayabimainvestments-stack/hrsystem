const db = require('./config/db');

const listAll = async () => {
    try {
        const users = await db.query("SELECT id, name, email FROM users");
        console.log('--- USERS ---');
        console.table(users.rows);

        const employees = await db.query("SELECT id, name, email, user_id FROM employees");
        console.log('\n--- EMPLOYEES ---');
        console.table(employees.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listAll();
