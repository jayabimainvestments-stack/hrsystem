const db = require('./config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function importEmployees() {
    const rawData = fs.readFileSync(path.join(__dirname, 'bulk_employees.json'));
    const employees = JSON.parse(rawData);

    console.log(`--- Starting Bulk Import of ${employees.length} Employees ---`);

    for (const emp of employees) {
        try {
            await db.query('BEGIN');
            console.log(`Processing: ${emp.name} (${emp.email})`);

            // 1. Check if user already exists
            const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [emp.email]);
            if (existingUser.rows.length > 0) {
                console.log(`Skipping ${emp.email}: User already exists.`);
                await db.query('ROLLBACK');
                continue;
            }

            // 2. Hash Password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(emp.password, salt);

            // 3. Create User
            const userResult = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
                [emp.name, emp.email, hashedPassword, emp.role]
            );
            const userId = userResult.rows[0].id;

            // 4. Create Employee Profile
            const emergencyContact = emp.emergency_contact ? JSON.stringify(emp.emergency_contact) : null;
            await db.query(
                `INSERT INTO employees 
                (user_id, designation, department, hire_date, phone, address, nic_passport, dob, gender, marital_status, is_epf_eligible, is_etf_eligible, emergency_contact) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    userId, emp.designation, emp.department, emp.hire_date, emp.phone, emp.address,
                    emp.nic_passport, emp.dob, emp.gender, emp.marital_status, emp.is_epf_eligible, emp.is_etf_eligible,
                    emergencyContact
                ]
            );

            // 5. Create Bank Details
            if (emp.bank_details) {
                await db.query(
                    `INSERT INTO employee_bank_details 
                    (user_id, bank_name, branch_code, account_number, account_holder_name)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        userId, emp.bank_details.bank_name, emp.bank_details.branch_code,
                        emp.bank_details.account_number, emp.bank_details.account_holder_name
                    ]
                );
            }

            await db.query('COMMIT');
            console.log(`Successfully onboarded: ${emp.name}`);

        } catch (error) {
            await db.query('ROLLBACK');
            console.error(`Error importing ${emp.email}:`, error.message);
        }
    }

    console.log('--- Bulk Import Completed ---');
    process.exit(0);
}

importEmployees();
