const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env
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

async function checkAttendance() {
    try {
        console.log("Checking Attendance for Feb 2026...");

        const res = await pool.query(`
            SELECT employee_id, status, late_minutes, date 
            FROM attendance 
            WHERE to_char(date, 'YYYY-MM') = '2026-02'
            ORDER BY date, employee_id
            LIMIT 50
        `);

        console.log("Sample Records:", res.rows.length);
        console.table(res.rows);

        const summary = await pool.query(`
            SELECT 
                employee_id,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
                SUM(late_minutes) as total_late_min
            FROM attendance
            WHERE to_char(date, 'YYYY-MM') = '2026-02'
            GROUP BY employee_id
        `);

        console.log("Summary by Employee:");
        console.table(summary.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkAttendance();
