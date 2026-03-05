const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5432/hr_db'
});

async function fix() {
    try {
        // Check if user 1 exists
        const userRes = await pool.query('SELECT * FROM users WHERE id = 1');
        if (userRes.rows.length === 0) {
            console.log('User 1 not found. Nothing to fix.');
            process.exit(0);
        }

        const user = userRes.rows[0];

        // Check if employee record exists
        const empRes = await pool.query('SELECT * FROM employees WHERE user_id = 1');
        if (empRes.rows.length > 0) {
            console.log('Employee record for User 1 already exists.');
            process.exit(0);
        }

        // Create employee record
        console.log('Creating employee record for Admin User...');
        await pool.query(
            `INSERT INTO employees (user_id, designation, department, hire_date, employment_status)
       VALUES ($1, $2, $3, CURRENT_DATE, 'Active')`,
            [1, 'System Administrator', 'Management']
        );

        console.log('Fix applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
