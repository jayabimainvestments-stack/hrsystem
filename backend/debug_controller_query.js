const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manual .env
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

const month = '2026-02';

async function runDebug() {
    try {
        console.log(`Running query for month: ${month}`);

        const result = await pool.query(`
            SELECT 
                e.id as employee_id, 
                ad.deduct_days AS stored_days,
                calc.absent_days AS calc_days,
                calc.late_hours AS calc_hours,
                COALESCE(ad.deduct_days, calc.absent_days, 0) as final_days
            FROM employees e
            LEFT JOIN attendance_deductions ad ON e.id = ad.employee_id AND ad.month = $1
            LEFT JOIN (
                SELECT 
                    employee_id,
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                    ROUND(SUM(COALESCE(late_minutes, 0)) / 60.0, 2) as late_hours
                FROM attendance
                WHERE to_char(date, 'YYYY-MM') = $1
                GROUP BY employee_id
            ) calc ON e.id = calc.employee_id
            WHERE e.employment_status = 'Active' OR e.employment_status IS NULL
            ORDER BY e.id
        `, [month]);

        console.table(result.rows);

        // Also check the subquery independently
        console.log("Subquery check:");
        const subResult = await pool.query(`
                SELECT 
                    employee_id,
                    COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
                    ROUND(SUM(COALESCE(late_minutes, 0)) / 60.0, 2) as late_hours
                FROM attendance
                WHERE to_char(date, 'YYYY-MM') = $1
                GROUP BY employee_id
        `, [month]);
        console.table(subResult.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

runDebug();
