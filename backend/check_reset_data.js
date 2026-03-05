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
        console.log('--- Checking Data to Reset ---');

        // Check January Payrolls
        const p = await pool.query("SELECT COUNT(*) FROM payroll WHERE month = '2026-01'");
        console.log('January 2026 Payroll Records:', p.rows[0].count);

        // Check All Salary Components
        const c = await pool.query('SELECT COUNT(*) FROM salary_components');
        console.log('Total Salary Components:', c.rows[0].count);

        // Check Employee Salary Structures (Dependent)
        const s = await pool.query('SELECT COUNT(*) FROM employee_salary_structure');
        console.log('Total Employee Salary Structures:', s.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
