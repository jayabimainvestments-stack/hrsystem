const db = require('./config/db');

async function listUsers() {
    try {
        const users = await db.query('SELECT id, name, email, role, password IS NOT NULL as has_password, force_password_change FROM users');
        console.log('--- Users ---');
        console.table(users.rows);

        const employees = await db.query('SELECT e.id, e.user_id, u.name, u.email FROM employees e LEFT JOIN users u ON e.user_id = u.id');
        console.log('--- All Employees ---');
        console.table(employees.rows);

        const orphanedEmployees = employees.rows.filter(e => !e.user_id);
        console.log('--- Employees without User Records ---');
        console.table(orphanedEmployees);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
