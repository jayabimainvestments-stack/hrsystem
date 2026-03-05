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

async function resetData() {
    const client = await pool.connect();
    try {
        console.log('--- RESETTING FINANCIAL DATA ---');
        await client.query('BEGIN');

        // 1. Delete January 2026 Payroll Data
        // Dependencies: payroll_details -> payroll
        // First get IDs for Jan payrolls
        const janPayrolls = await client.query("SELECT id FROM payroll WHERE month = '2026-01'");

        if (janPayrolls.rows.length > 0) {
            const ids = janPayrolls.rows.map(r => r.id);
            // Delete details for these payrolls
            // $1 must be passed as an array for ANY
            await client.query("DELETE FROM payroll_details WHERE payroll_id = ANY($1)", [ids]);

            // Delete the payroll records themselves
            // We can delete by month directly which is safer/easier if no otherFKs
            const pRes = await client.query("DELETE FROM payroll WHERE month = '2026-01'");
            console.log(`Deleted ${pRes.rowCount} January Payroll records.`);
        } else {
            console.log('No January Payroll records found.');
        }

        // 2. Clear Employee Salary Structures (Dependent on Components)
        const sRes = await client.query("DELETE FROM employee_salary_structure");
        console.log(`Deleted ${sRes.rowCount} Employee Salary Structures.`);

        // 3. Delete All Salary Components
        const cRes = await client.query("DELETE FROM salary_components");
        console.log(`Deleted ${cRes.rowCount} Salary Components.`);

        // Reset Sequence for components if simple ID
        // Note: Resetting sequence might fail if permissions issue or not owned, but usually fine in dev.
        try {
            await client.query("ALTER SEQUENCE salary_components_id_seq RESTART WITH 1");
            console.log("Sequence reset.");
        } catch (seqErr) {
            console.log("Sequence reset skipped/failed (non-critical):", seqErr.message);
        }

        await client.query('COMMIT');
        console.log('--- RESET COMPLETE ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR during reset:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

resetData();
