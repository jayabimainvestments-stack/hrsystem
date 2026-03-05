const db = require('./config/db');
const bcrypt = require('bcryptjs');

const seedUsers = async () => {
    try {
        // Check if admin exists
        const adminExists = await db.query("SELECT * FROM users WHERE email = 'admin@example.com'");
        if (adminExists.rows.length > 0) {
            console.log('Admin user already exists');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123456', salt);

            await db.query(
                "INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@example.com', $1, 'Admin')",
                [hashedPassword]
            );
            console.log('Admin user created');
        }

        // Check if employee exists
        const empExists = await db.query("SELECT * FROM users WHERE email = 'employee@example.com'");
        if (empExists.rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123456', salt);

            const newUser = await db.query(
                "INSERT INTO users (name, email, password, role) VALUES ('John Doe', 'employee@example.com', $1, 'Employee') RETURNING id",
                [hashedPassword]
            );

            // Create employee profile
            await db.query(
                "INSERT INTO employees (user_id, nic_passport, designation, department, hire_date) VALUES ($1, 'A1234567', 'Software Engineer', 'IT', '2023-01-15')",
                [newUser.rows[0].id]
            );
            console.log('Sample employee created');
        }

        // Check if HR Manager exists
        const hrExists = await db.query("SELECT * FROM users WHERE email = 'hr@example.com'");
        if (hrExists.rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123456', salt);

            await db.query(
                "INSERT INTO users (name, email, password, role) VALUES ('HR Manager', 'hr@example.com', $1, 'HR Manager')",
                [hashedPassword]
            );
            console.log('HR Manager user created');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedUsers();
