const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const bcrypt = require('bcryptjs');

const migrateEmployees = async () => {
    try {
        const employeesPath = path.join(__dirname, '../frontend/employees.json');
        if (!fs.existsSync(employeesPath)) {
            console.error('employees.json not found!');
            process.exit(1);
        }

        const rawData = JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
        console.log(`Loaded ${rawData.length} records.`);

        // Deduplicate by NIC, prioritizing Active
        const uniqueEmployees = new Map();

        rawData.forEach(emp => {
            const nic = emp.nic.trim().toUpperCase();
            if (!uniqueEmployees.has(nic)) {
                uniqueEmployees.set(nic, emp);
            } else {
                const existing = uniqueEmployees.get(nic);
                if (existing.status !== 'Active' && emp.status === 'Active') {
                    uniqueEmployees.set(nic, emp); // Replace with active
                }
            }
        });

        console.log(`Processing ${uniqueEmployees.size} unique employees...`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        for (const emp of uniqueEmployees.values()) {
            const nic = emp.nic.trim().toUpperCase(); // Normalize NIC
            const email = `${nic}@jayabima.com`;
            const name = emp.name.trim();
            const status = emp.status === 'Active' ? 'Active' : 'Inactive';

            // Check if user exists
            const userCheck = await db.query("SELECT id FROM users WHERE email = $1", [email]);
            let userId;

            if (userCheck.rows.length === 0) {
                // Create User
                const userRes = await db.query(
                    "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'Employee') RETURNING id",
                    [name, email, hashedPassword]
                );
                userId = userRes.rows[0].id;
                console.log(`Created user for ${name}`);
            } else {
                userId = userCheck.rows[0].id;
                console.log(`User already exists for ${name}`);
            }

            // Check if employee profile exists
            const empCheck = await db.query("SELECT id FROM employees WHERE nic_passport = $1", [nic]);

            if (empCheck.rows.length === 0) {
                await db.query(
                    "INSERT INTO employees (user_id, nic_passport, designation, department, employment_status) VALUES ($1, $2, 'Collector', 'Operations', $3)",
                    [userId, nic, status]
                );
                console.log(`Created employee profile for ${name}`);
            } else {
                // Update status if needed
                await db.query(
                    "UPDATE employees SET employment_status = $2 WHERE nic_passport = $1",
                    [nic, status]
                );
                console.log(`Updated employee profile for ${name}`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit();

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateEmployees();
