const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log("Script starting...");

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
console.log("Conn String length:", connectionString ? connectionString.length : 'null');

const pool = new Pool({ connectionString });

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Query Error:", err);
    } else {
        console.log("DB Time:", res.rows[0].now);

        // Count attendance
        pool.query(`
            SELECT 
                employee_id,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
                SUM(late_minutes) as total_late_min
            FROM attendance
            GROUP BY employee_id
            ORDER BY employee_id
        `, (e, r) => {
            if (e) console.error(e);
            else {
                console.log("Attendance Summary:");
                console.table(r.rows);
            }
            pool.end();
        });
    }
});
