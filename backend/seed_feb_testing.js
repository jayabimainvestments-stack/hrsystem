const db = require('./config/db');

/**
 * Targeted Attendance Seeder for Testing
 * Generates Feb 2026 attendance with specific lates and absences.
 */
async function seedTestingAttendance() {
    console.log('--- SEEDING FEB 2026 ATTENDANCE FOR TESTING ---');

    try {
        // 1. Get all active employees
        const empRes = await db.query(`
            SELECT e.id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active' OR e.employment_status IS NULL
        `);
        const employees = empRes.rows;

        if (employees.length === 0) {
            console.log('No employees found.');
            return;
        }

        const month = '2026-02';
        const days = 20; // Up to Feb 20
        const source = 'FEB_TEST_SEED';

        console.log(`Seeding for ${employees.length} employees up to ${month}-${days}...`);

        for (let d = 1; d <= days; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();

            // Skip Sundays
            if (dayOfWeek === 0) continue;

            for (const emp of employees) {
                const rand = Math.random();
                let status = 'Present';
                let clockIn = '08:15:00';
                let clockOut = '17:05:00';
                let lateMinutes = 0;

                if (rand < 0.15) {
                    // 15% Absent
                    status = 'Absent';
                    clockIn = null;
                    clockOut = null;
                } else if (rand < 0.35) {
                    // 20% Late (sincerand is between 0.15 and 0.35)
                    status = 'Late';
                    // Random late time between 09:00 and 10:30
                    const lateHour = 9;
                    const lateMin = Math.floor(Math.random() * 60);
                    clockIn = `0${lateHour}:${String(lateMin).padStart(2, '0')}:00`;

                    // Calculate late minutes from 08:30 (standard start)
                    const actualIn = lateHour * 60 + lateMin;
                    const expectedIn = 8 * 60 + 30;
                    lateMinutes = Math.max(0, actualIn - expectedIn);
                }

                await db.query(`
                    INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, late_minutes, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (employee_id, date) DO UPDATE
                    SET clock_in = EXCLUDED.clock_in,
                        clock_out = EXCLUDED.clock_out,
                        status = EXCLUDED.status,
                        late_minutes = EXCLUDED.late_minutes,
                        source = EXCLUDED.source
                `, [emp.id, dateStr, clockIn, clockOut, status, lateMinutes, source]);
            }
            process.stdout.write('.');
        }

        console.log('\n✅ Seeding complete.');
    } catch (err) {
        console.error('❌ Error seeding:', err);
    } finally {
        process.exit();
    }
}

seedTestingAttendance();
