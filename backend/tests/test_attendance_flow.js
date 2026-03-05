const db = require('../config/db');

async function testAttendanceFlow() {
    console.log('--- TEST: Attendance & Overtime Flow ---');

    try {
        // 1. Setup Employee
        const empRes = await db.query("SELECT id FROM employees LIMIT 1");
        if (empRes.rows.length === 0) { console.error('No employee found'); return; }
        const employeeId = empRes.rows[0].id;

        // 2. Log Attendance with Overtime (Late out)
        // Policy end: 16:30. We clock out at 18:00 (1.5 hours OT)
        const date = '2025-05-15';
        const clockIn = '08:00';
        const clockOut = '18:00';

        // Clean up previous test data
        await db.query('DELETE FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, date]);

        console.log(`Logging attendance for Emp ${employeeId} on ${date} (08:00 - 18:00)...`);

        // We'll simulate the controller action by inserting directly via SQL that mirrors controller logic
        // OR we can make a mock request if we exported the controller functions.
        // Let's rely on the DB trigger/logic we just wrote? No, logic is in controller.
        // So we must verify by calling the controller OR trusting the unit test of logic.
        // Since I can't easily invoke controller here without req/res mocks and dependencies,
        // and I just rewrote the file, I should verify the `calculateOvertimeHours` utility first using the Utils file?
        // But I want to verify the E2E flow.

        // I'll stick to testing the Utils function logic here first as a sanity check, 
        // then try to Mock the controller call like I did for Financial.

        const { calculateOvertimeHours } = require('../utils/attendance.utils');
        const ot = calculateOvertimeHours('18:00', '16:30:00');
        if (ot !== 1.5) throw new Error(`OT Calculation Failed. Expected 1.5, got ${ot}`);
        console.log('✅ Utils Logic: OT Check Passed (1.5h)');

        // Now Mock Controller
        const { logAttendance } = require('../controllers/attendance.controller');

        const req = {
            body: {
                employee_id: employeeId,
                date: date,
                clock_in: clockIn,
                clock_out: clockOut,
                status: 'Present',
                source: 'Test'
            }
        };

        const res = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 200) throw new Error(`Controller failed with ${code}: ${data.message}`);
                    return data;
                }
            })
        };

        await logAttendance(req, res);

        // Verify DB
        const dbCheck = await db.query('SELECT overtime_hours FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, date]);
        const dbOt = parseFloat(dbCheck.rows[0].overtime_hours);

        if (dbOt === 1.5) {
            console.log('✅ Controller Logic: DB Update Passed (1.5h saved)');
        } else {
            console.error(`❌ DB Mismatch: Expected 1.5, got ${dbOt}`);
            throw new Error('OT not saved to DB');
        }

        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testAttendanceFlow();
