const db = require('../config/db');

// @desc    Process punch from biometric device
// @route   POST /api/biometric/punch
// @access  Device Only (API Key)
const processPunch = async (req, res) => {
    const { biometric_id, punch_time, device_key } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Authenticate Device
        const deviceRes = await db.query('SELECT * FROM attendance_devices WHERE api_key = $1 AND status = $2', [device_key, 'Active']);
        if (deviceRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(401).json({ message: 'Unauthorized or inactive device' });
        }
        const device = deviceRes.rows[0];

        // 2. Identify Employee
        const empRes = await db.query('SELECT id, user_id FROM employees WHERE biometric_id = $1', [biometric_id]);
        if (empRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: `Biometric ID ${biometric_id} not mapped to any employee.` });
        }
        const employee = empRes.rows[0];

        // Parse punch_time safely
        let pDate;
        if (punch_time.includes('T') || punch_time.includes('-')) {
            pDate = new Date(punch_time);
        } else {
            // If just time HH:mm:ss, use today's date
            pDate = new Date();
        }

        const punchDate = pDate.toISOString().split('T')[0];
        const punchTime = (punch_time.includes('T') || punch_time.includes('-'))
            ? pDate.toTimeString().split(' ')[0]
            : punch_time;

        const existingAttendance = await db.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [employee.id, punchDate]
        );

        let result;
        if (existingAttendance.rows.length === 0) {
            // First punch of the day -> Clock In
            result = await db.query(
                `INSERT INTO attendance (employee_id, date, clock_in, source, device_id)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [employee.id, punchDate, punchTime, 'Biometric', device.device_name]
            );
            console.log(`[BIOMETRIC] Employee ${employee.id} Clocked-In at ${punchTime}`);
        } else {
            // Subsequent punch -> Update Clock Out to the latest punch
            result = await db.query(
                `UPDATE attendance 
                 SET clock_out = $1, 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 RETURNING *`,
                [punchTime, existingAttendance.rows[0].id]
            );
            console.log(`[BIOMETRIC] Employee ${employee.id} Clocked-Out/Updated at ${punchTime}`);
        }

        // 4. Update Device Last Sync
        await db.query('UPDATE attendance_devices SET last_sync = CURRENT_TIMESTAMP WHERE id = $1', [device.id]);

        await db.query('COMMIT');
        res.status(200).json({
            message: 'Punch processed successfully',
            attendance: result.rows[0]
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[BIOMETRIC_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new biometric device
// @route   POST /api/biometric/devices
// @access  Private (Admin)
const registerDevice = async (req, res) => {
    const { device_name, branch_name, ip_address, api_key } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO attendance_devices (device_name, branch_name, ip_address, api_key, status)
             VALUES ($1, $2, $3, $4, 'Active') RETURNING *`,
            [device_name, branch_name, ip_address, api_key]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all registered biometric devices
const getDevices = async (req, res) => {
    try {
        const result = await db.query('SELECT id, device_name, branch_name, ip_address, status, last_sync, created_at FROM attendance_devices ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('+++ CRITICAL: getDevices SQL Error +++', error);
        res.status(500).json({ message: 'Hardware Registry Error: ' + error.message });
    }
};

// @desc    Delete/Decommission a device
const deleteDevice = async (req, res) => {
    try {
        await db.query('DELETE FROM attendance_devices WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Device deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk process punches (for USB import)
// @route   POST /api/biometric/punch-bulk
// @access  Device API Key
const bulkProcessPunches = async (req, res) => {
    const { punches, device_key } = req.body; // punches: [{ biometric_id, punch_time }]
    
    if (!punches || !Array.isArray(punches)) {
        return res.status(400).json({ message: 'Invalid punches array' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Authenticate Device
            const deviceRes = await client.query('SELECT * FROM attendance_devices WHERE api_key = $1 AND status = $2', [device_key, 'Active']);
            if (deviceRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(401).json({ message: 'Unauthorized or inactive device' });
            }
            const device = deviceRes.rows[0];

            let successCount = 0;
            let errorCount = 0;

            for (const punch of punches) {
                const { biometric_id, punch_time } = punch;
                
                // Identify Employee
                const empRes = await client.query('SELECT id FROM employees WHERE biometric_id = $1', [biometric_id]);
                if (empRes.rows.length === 0) {
                    errorCount++;
                    continue;
                }
                const employee = empRes.rows[0];

                const pDate = new Date(punch_time);
                const punchDate = pDate.toISOString().split('T')[0];
                const punchTimeStr = pDate.toTimeString().split(' ')[0];

                const existingAttendance = await client.query(
                    'SELECT id, clock_in FROM attendance WHERE employee_id = $1 AND date = $2',
                    [employee.id, punchDate]
                );

                if (existingAttendance.rows.length === 0) {
                    // First punch -> Clock In
                    await client.query(
                        `INSERT INTO attendance (employee_id, date, clock_in, source, device_id)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [employee.id, punchDate, punchTimeStr, 'Biometric-USB', device.device_name]
                    );
                } else {
                    const existing = existingAttendance.rows[0];
                    // If this punch is much later than the current clock_out, update clock_out.
                    // Or simply update clock_out to the maximum time for that day.
                    await client.query(
                        `UPDATE attendance 
                         SET clock_out = GREATEST(COALESCE(clock_out, '00:00:00'), $1),
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE id = $2`,
                        [punchTimeStr, existing.id]
                    );
                }
                successCount++;
            }

            await client.query('UPDATE attendance_devices SET last_sync = CURRENT_TIMESTAMP WHERE id = $1', [device.id]);
            await client.query('COMMIT');
            
            res.status(200).json({
                message: `Processed ${successCount} punches. ${errorCount} employees not found.`,
                successCount,
                errorCount
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[BIOMETRIC_BULK_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { processPunch, bulkProcessPunches, registerDevice, getDevices, deleteDevice };

