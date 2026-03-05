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

async function resetAndSeed() {
    console.log("=== RESETTING AND SEEDING ATTENDANCE (FEB 2026) ===");

    try {
        // 1. Clear Data
        console.log("1. Truncating 'attendance' and 'leaves'...");
        // Using CASCADE to clean up dependent tables if any
        await pool.query("TRUNCATE attendance, leaves RESTART IDENTITY CASCADE");
        console.log("   Tables cleared.");

        // 2. Get Employees
        const empRes = await pool.query("SELECT id FROM employees WHERE employment_status = 'Active' OR employment_status IS NULL");
        const employees = empRes.rows;
        console.log(`2. Found ${employees.length} active employees to seed.`);

        if (employees.length === 0) {
            console.log("   No employees found. Exiting.");
            return;
        }

        // 3. Generate Data for Feb 2026
        const year = 2026;
        const month = 1; // 0-indexed, 1 = Feb
        const startDay = 1;
        const endDay = 28; // Feb 2026

        const records = [];

        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
            const dateStr = date.toISOString().split('T')[0];

            // Logic:
            // Sun (0): Off
            // Sat (6): Half Day (08:00 - 13:00)
            // Mon-Fri (1-5): Full Day (08:00 - 17:00)

            if (dayOfWeek === 0) continue; // Skip Sunday

            for (const emp of employees) {
                let status = 'Present';
                let clockIn, clockOut, lateMinutes = 0;

                // Randomness
                const rand = Math.random();

                // 5% Absent, 5% Leave (Implicitly absent from attendance table or marked Absent)
                if (rand < 0.05) {
                    status = 'Absent';
                    clockIn = null;
                    clockOut = null;
                } else if (rand < 0.10) {
                    // Create a Leave Request implementation would go here, 
                    // but for now we just mark as Absent or Leave in attendance?
                    // Usually attendance doesn't have 'Leave' status directly, it's inferred from leave_requests.
                    // We'll just mark 'Absent' in attendance for simplicity, or skip record.
                    // If we skip, it shows as Absent in reports usually.
                    // Let's explicitly mark Absent.
                    status = 'Absent';
                    clockIn = null;
                    clockOut = null;
                } else {
                    // Present
                    // Add some noise to times
                    const noiseIn = Math.floor(Math.random() * 30) - 15; // +/- 15 mins
                    const noiseOut = Math.floor(Math.random() * 30) - 15;

                    let baseInHour = 8;
                    let baseOutHour = 17;

                    if (dayOfWeek === 6) { // Saturday
                        baseOutHour = 13;
                    }

                    // Late logic (another 5% chance of being significantly late)
                    if (Math.random() < 0.05) {
                        status = 'Late';
                        baseInHour = 9; // Late by an hour essentially
                        lateMinutes = 60;
                    }

                    // Format Time
                    const inTime = new Date(year, month, day, baseInHour, 0 + noiseIn);
                    const outTime = new Date(year, month, day, baseOutHour, 0 + noiseOut);

                    clockIn = inTime.toTimeString().split(' ')[0];
                    clockOut = outTime.toTimeString().split(' ')[0];
                }

                records.push([
                    emp.id,
                    dateStr,
                    clockIn,
                    clockOut,
                    status,
                    lateMinutes,
                    'FEB_SEED_2026'
                ]);
            }
        }

        console.log(`3. Generated ${records.length} attendance records.`);

        // 4. Insert Batch
        console.log("4. Inserting records...");

        // Simple chunked insert to avoid parameter limit
        const chunkSize = 1000;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            // Construct query manually for bulk insert is faster, or just loop. 
            // Looping is safer for types but slower. 
            // Given node-pg, we can use a loop or unnest.
            // Let's use loop for simplicity and reliability in this script context.

            // Actually, let's use a single transaction for the chunk
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (const row of chunk) {
                    await client.query(
                        `INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, late_minutes, source)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        row
                    );
                }
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
            process.stdout.write('.');
        }
        console.log("\n   Insertion complete.");
        console.log("✅ SUCCESS: Attendance and Leave data reset and seeded for Feb 2026.");

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await pool.end();
    }
}

resetAndSeed();
