const db = require('./config/db');

async function seedAttendance2026() {
    console.log('--- STARTING 2026 ATTENDANCE SEEDING (DEVELOPMENT) ---');
    try {
        // 1. Get all employees
        const empRes = await db.query('SELECT id FROM employees');
        const employees = empRes.rows;

        if (employees.length === 0) {
            console.log('No employees found to seed.');
            return;
        }

        const year = 2026;
        const records = [];
        const source = 'DEV_STRESS_TEST_2026'; // Unique source to allow easy removal

        // CLEAR ONLY TEST ATTENDANCE
        await db.query('DELETE FROM attendance WHERE source = $1', [source]);
        console.log(`Cleared existing test attendance (source: ${source}).`);

        // Seed for Feb (index 1)
        for (let month = 1; month < 2; month++) { // 1 = Feb
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();

                // Only weekdays (1-5)
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    const dateStr = date.toISOString().split('T')[0];

                    // Don't seed future dates beyond today (Feb 15, 2026)
                    if (date > new Date('2026-02-15')) continue;

                    for (const emp of employees) {
                        // Random status: 90% Present, 5% Late, 5% Absent
                        const rand = Math.random();
                        let status = 'Present';
                        let clockIn = '08:30:00';
                        let clockOut = '16:30:00';
                        let lateMinutes = 0;

                        if (rand > 0.95) {
                            status = 'Absent';
                            clockIn = null;
                            clockOut = null;
                        } else if (rand > 0.9) {
                            status = 'Late';
                            clockIn = '09:15:00'; // Late entry
                            lateMinutes = 45;
                        }

                        records.push([
                            emp.id,
                            dateStr,
                            clockIn,
                            clockOut,
                            status,
                            lateMinutes,
                            source
                        ]);
                    }
                }
            }
        }

        console.log(`Prepared ${records.length} records. Inserting...`);

        // Batch insert
        for (const record of records) {
            await db.query(`
                INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, late_minutes, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (employee_id, date) DO NOTHING
            `, record);
        }

        console.log('✅ Seeding complete. All records tagged with source "DEV_STRESS_TEST_2026".');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        process.exit();
    }
}

seedAttendance2026();
