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

async function debug() {
    try {
        console.log('--- Debugging No Pay Issue ---');

        // 1. Check if 'No Pay' component exists
        const compRes = await pool.query("SELECT * FROM salary_components WHERE name ILIKE '%No Pay%'");
        console.log('1. Salary Components matching "No Pay":', compRes.rows);

        // 2. Check Deduction Status for a specific employee (e.g., ID 4 from previous context)
        // Let's check for ALL processed deductions in the current month to see if any worked
        const deductionsRes = await pool.query(`
            SELECT * FROM attendance_deductions 
            WHERE month = '2026-02' 
            ORDER BY updated_at DESC LIMIT 5
        `);
        console.log('2. Recent Deductions:', deductionsRes.rows.map(d => ({
            id: d.id,
            emp_id: d.employee_id,
            amount: d.total_amount,
            status: d.status,
            updated_at: d.updated_at
        })));

        if (deductionsRes.rows.length > 0) {
            // Check specifically for Employee ID 4 (EPF-003) from the user's screenshot/context
            const targetEmpId = 4;
            console.log(`3. Checking Salary Structure for Employee ID ${targetEmpId}...`);

            const structRes = await pool.query(`
                SELECT ess.*, sc.name 
                FROM employee_salary_structure ess
                JOIN salary_components sc ON ess.component_id = sc.id
                WHERE ess.employee_id = $1
            `, [targetEmpId]);
            console.log('3. Salary Structure:', structRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debug();
