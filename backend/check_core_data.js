const db = require('./config/db');

async function verifyData() {
    try {
        console.log('--- VERIFYING CORE DATA ---');

        const employees = await db.query('SELECT e.id, e.user_id, u.name, u.email FROM employees e JOIN users u ON e.user_id = u.id');
        console.log('Employees found:', employees.rows.length);
        console.table(employees.rows);

        const users = await db.query('SELECT id, name, email, role FROM users');
        console.log('Users found:', users.rows.length);
        console.table(users.rows);

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyData();
