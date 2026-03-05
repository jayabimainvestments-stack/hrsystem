const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.join(__dirname, '.env');
let connectionString = process.env.DATABASE_URL;

if (!connectionString && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
        if (line.startsWith('DATABASE_URL=')) {
            connectionString = line.split('=')[1].trim();
            break;
        }
    }
}

const pool = new Pool({ connectionString });

async function check() {
    try {
        console.log('--- VERIFYING DATA INTEGRITY ---');

        // 1. Check Employees
        const emp = await pool.query('SELECT COUNT(*) FROM employees');
        const activeEmp = await pool.query("SELECT COUNT(*) FROM employees WHERE employment_status = 'Active'");
        console.log(`Total Employees: ${emp.rows[0].count}`);
        console.log(`Active Employees: ${activeEmp.rows[0].count}`);

        // 2. Check Users (Auth)
        const users = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`Total System Users: ${users.rows[0].count}`);

        // 3. Check Attendance (Should be untouched)
        const att = await pool.query('SELECT COUNT(*) FROM attendance');
        console.log(`Attendance Records: ${att.rows[0].count}`);

        // 4. Sample Data
        const sample = await pool.query(`
            SELECT id, emp_no, name, designation, employment_status 
            FROM employees 
            ORDER BY id ASC 
            LIMIT 5
        `);
        console.log('\nSample Employee Data:');
        console.table(sample.rows);

    } catch (err) {
        console.error('Error verifying data:', err);
    } finally {
        pool.end();
    }
}

check();
