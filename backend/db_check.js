const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5432/hr_db'
});

async function check() {
    try {
        console.log('--- Users ---');
        const users = await pool.query('SELECT id, name, email, role FROM users');
        console.table(users.rows);

        console.log('\n--- Employees ---');
        const employees = await pool.query('SELECT id, user_id, designation, department FROM employees');
        console.table(employees.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
