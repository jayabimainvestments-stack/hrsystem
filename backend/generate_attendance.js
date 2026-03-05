const db = require('./config/db');

/**
 * Reusable Attendance Generator
 * Generates random attendance data for all employees for a given month
 * 
 * Usage: node generate_attendance.js [YYYY-MM] [days]
 * Example: node generate_attendance.js 2026-02 15
 */

async function generateAttendance() {
    const args = process.argv.slice(2);
    const month = args[0] || '2026-02';
    const daysToGenerate = parseInt(args[1]) || 15;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log(`\n=== GENERATING ATTENDANCE DATA FOR ${month} (${daysToGenerate} days) ===\n`);

        // Get all active employees
        const empRes = await client.query(`
            SELECT e.id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);
        const employees = empRes.rows;
        console.log(`👥 Found ${employees.length} active employees`);

        // Get work start time from policy
        const policyRes = await client.query("SELECT work_start_time FROM attendance_policies WHERE id = 1");
        const workStartTime = policyRes.rows[0]?.work_start_time || '08:30:00';
        console.log(`⏰ Work start time: ${workStartTime}\n`);

        let totalRecords = 0;
        const stats = {
            present: 0,
            late: 0,
            absent: 0,
            halfDay: 0
        };

        // Generate attendance for each day
        for (let day = 1; day <= daysToGenerate; day++) {
            const date = `${month}-${String(day).padStart(2, '0')}`;
            console.log(`📅 Generating for ${date}...`);

            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay();

            // Skip weekends (Sunday=0, Saturday=6)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                console.log(`   Skipping weekend: ${date}`);
                continue;
            }

            for (const emp of employees) {
                // Random attendance pattern (weighted probabilities)
                const rand = Math.random();
                let status, clockIn, clockOut;
                let lateMinutes = 0;
                let overtimeHours = 0;

                if (rand < 0.70) {
                    // 70% chance: Present (on time or slightly late)
                    lateMinutes = Math.random() < 0.3 ? Math.floor(Math.random() * 60) : 0; // 30% chance of being late
                    const [hours, minutes] = workStartTime.split(':');
                    const startMinutes = parseInt(hours) * 60 + parseInt(minutes) + lateMinutes;
                    const clockInHours = Math.floor(startMinutes / 60);
                    const clockInMinutes = startMinutes % 60;

                    clockIn = `${String(clockInHours).padStart(2, '0')}:${String(clockInMinutes).padStart(2, '0')}:00`;

                    // Clock out: 8-9 hours later
                    const workHours = 8 + Math.floor(Math.random() * 2);
                    overtimeHours = workHours > 8 ? workHours - 8 : 0;
                    const outMinutes = startMinutes + (workHours * 60);
                    const clockOutHours = Math.floor(outMinutes / 60);
                    const clockOutMinutes = outMinutes % 60;
                    clockOut = `${String(clockOutHours).padStart(2, '0')}:${String(clockOutMinutes).padStart(2, '0')}:00`;

                    status = lateMinutes > 0 ? 'Late' : 'Present';
                    stats[status.toLowerCase()]++;

                } else if (rand < 0.85) {
                    // 15% chance: Absent
                    status = 'Absent';
                    clockIn = null;
                    clockOut = null;
                    stats.absent++;

                } else {
                    // 15% chance: Half Day
                    const [hours, minutes] = workStartTime.split(':');
                    clockIn = `${hours}:${minutes}:00`;

                    // Half day: 4 hours
                    const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                    const outMinutes = startMinutes + 240; // 4 hours
                    const clockOutHours = Math.floor(outMinutes / 60);
                    const clockOutMinutes = outMinutes % 60;
                    clockOut = `${String(clockOutHours).padStart(2, '0')}:${String(clockOutMinutes).padStart(2, '0')}:00`;

                    status = 'Half Day';
                    stats.halfDay++;
                }

                // Insert attendance record
                await client.query(
                    `INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, source, late_minutes, overtime_hours)
                     VALUES ($1, $2, $3, $4, $5, 'Generated', $6, $7)
                     ON CONFLICT (employee_id, date) DO UPDATE
                     SET clock_in = EXCLUDED.clock_in,
                         clock_out = EXCLUDED.clock_out,
                         status = EXCLUDED.status,
                         source = EXCLUDED.source,
                         late_minutes = EXCLUDED.late_minutes,
                         overtime_hours = EXCLUDED.overtime_hours`,
                    [emp.id, date, clockIn, clockOut, status, lateMinutes, overtimeHours]
                );
                totalRecords++;
            }
        }

        await client.query('COMMIT');

        console.log(`\n✅ GENERATION COMPLETE!`);
        console.log(`\n📊 Statistics:`);
        console.log(`   Total Records: ${totalRecords}`);
        console.log(`   Present: ${stats.present} (${((stats.present / totalRecords) * 100).toFixed(1)}%)`);
        console.log(`   Late: ${stats.late} (${((stats.late / totalRecords) * 100).toFixed(1)}%)`);
        console.log(`   Absent: ${stats.absent} (${((stats.absent / totalRecords) * 100).toFixed(1)}%)`);
        console.log(`   Half Day: ${stats.halfDay} (${((stats.halfDay / totalRecords) * 100).toFixed(1)}%)`);

        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

generateAttendance();
