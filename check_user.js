const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkUser() {
    try {
        const email = 'KRISHANTHA@jayabima.com';
        console.log(`Checking for user: ${email}`);

        const res = await pool.query('SELECT id, name, email, role, force_password_change, activation_token FROM users WHERE LOWER(email) = LOWER($1)', [email]);

        if (res.rows.length === 0) {
            console.log('User NOT found in "users" table.');

            // Check employees table too
            const empRes = await pool.query('SELECT id, name, email FROM employees WHERE LOWER(email) = LOWER($1)', [email]);
            if (empRes.rows.length > 0) {
                console.log('User found in "employees" table, but missing from "users" table. Authentication requires a record in "users".');
                console.log(JSON.stringify(empRes.rows, null, 2));
            } else {
                console.log('User also NOT found in "employees" table.');

                // Search for any user with name containing KRISHANTHA
                const searchRes = await pool.query("SELECT email FROM employees WHERE name ILIKE '%KRISHANTHA%'");
                if (searchRes.rows.length > 0) {
                    console.log('Found similar names in employees table:');
                    console.log(JSON.stringify(searchRes.rows, null, 2));
                }
            }
        } else {
            console.log('User found in "users" table:');
            console.log(JSON.stringify(res.rows, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
