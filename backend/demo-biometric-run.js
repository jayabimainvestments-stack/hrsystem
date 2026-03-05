const db = require('./config/db');
const crypto = require('crypto');

const runDemo = async () => {
    try {
        console.log('--- Biometric Integration Demo ---');

        // 1. Map Biometric ID to Employee 6
        await db.query("UPDATE employees SET biometric_id = '999' WHERE id = 6");
        console.log('1. Employee 6 mapped to Biometric ID: 999');

        // 2. Register Mock Device
        const apiKey = crypto.randomBytes(16).toString('hex');
        const deviceRes = await db.query(
            "INSERT INTO attendance_devices (device_name, branch_name, ip_address, api_key) VALUES ($1, $2, $3, $4) RETURNING *",
            ['Demo Reader (Main Office)', 'Colombo HQ', '192.168.1.50', apiKey]
        );
        const device = deviceRes.rows[0];
        console.log(`2. Mock Device Registered: ${device.device_name} (API Key: ${apiKey})`);

        // 3. Simulate Clock-In (8:30 AM)
        const punch1 = {
            biometric_id: '999',
            punch_time: '2026-02-10T08:30:00Z',
            device_key: apiKey
        };
        console.log('\n3. Simulating Clock-In at 08:30 AM...');
        // We call the controller logic directly via a helper or simulated HTTP-like call
        // For this demo, let's just trigger the same logic manually via SQL to show the result

        const punchDate1 = new Date(punch1.punch_time).toISOString().split('T')[0];
        const punchTime1 = new Date(punch1.punch_time).toTimeString().split(' ')[0];

        await db.query(
            "INSERT INTO attendance (employee_id, date, clock_in, source, device_id) VALUES ($1, $2, $3, $4, $5)",
            [6, punchDate1, punchTime1, 'Biometric', device.device_name]
        );
        console.log('   SUCCESS: Clock-In record created.');

        // 4. Simulate Clock-Out (5:30 PM)
        const punch2 = {
            biometric_id: '999',
            punch_time: '2026-02-10T17:30:00Z',
            device_key: apiKey
        };
        console.log('\n4. Simulating Clock-Out at 05:30 PM...');
        const punchTime2 = new Date(punch2.punch_time).toTimeString().split(' ')[0];

        await db.query(
            "UPDATE attendance SET clock_out = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 AND date = $3",
            [punchTime2, 6, punchDate1]
        );
        console.log('   SUCCESS: Clock-Out record updated.');

        // 5. Verify Result
        const finalRes = await db.query("SELECT * FROM attendance WHERE employee_id = 6 AND date = $1", [punchDate1]);
        console.log('\n--- Final Attendance Record ---');
        console.table(finalRes.rows);

        process.exit();
    } catch (error) {
        console.error('Demo Failed:', error);
        process.exit(1);
    }
};

runDemo();
