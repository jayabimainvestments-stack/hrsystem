const db = require('./config/db');

async function testUpdate() {
    try {
        console.log("Testing attendance update logic...");

        // 1. Get an existing attendance record
        const att = await db.query('SELECT id FROM attendance LIMIT 1');
        if (att.rows.length === 0) {
            console.log("No attendance records found to test.");
            return;
        }
        const id = att.rows[0].id;
        console.log(`Testing with attendance ID: ${id}`);

        // 2. Mock a request-like object or call the logic (we'll just simulate the SQL)
        const clock_in = '08:45:00';
        const clock_out = '17:30:00';
        const status = 'Present';

        // This is the logic from updateAttendance
        const existingRes = await db.query('SELECT * FROM attendance WHERE id = $1', [id]);
        const existing = existingRes.rows[0];

        const newValue = {
            clock_in,
            clock_out,
            status,
            late_minutes: 15,
            overtime_hours: 0.5
        };

        console.log("Attempting to insert into pending_changes...");
        await db.query(
            `INSERT INTO pending_changes (
                entity, entity_id, field_name, old_value, new_value, 
                requested_by, reason, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                'attendance',
                id,
                'Correction',
                existing.status,
                JSON.stringify(newValue),
                1, // Assuming user ID 1 exists
                'HR Correction Request',
                'Pending'
            ]
        );

        console.log("✅ Success!");
    } catch (err) {
        console.error("❌ Failed:", err);
    } finally {
        process.exit(0);
    }
}

testUpdate();
