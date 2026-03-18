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

        // Parse punch_time safely (Timezone Agnostic)
        // Biometric devices send "wall clock" time. We extract strings directly to avoid server TZ shifts.
        let pDate = new Date(punch_time);
        let punchDate, punchTime;

        if (punch_time.includes('T')) {
            const parts = punch_time.split('T');
            punchDate = parts[0];
            punchTime = parts[1].split('.')[0].split('+')[0].replace('Z', '');
        } else if (punch_time.includes(' ')) {
            const parts = punch_time.split(' ');
            punchDate = parts[0];
            punchTime = parts[1];
        } else {
            punchDate = new Date().toISOString().split('T')[0];
            punchTime = punch_time;
        }

        const existingAttendance = await db.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [employee.id, punchDate]
        );


        let result;
        if (existingAttendance.rows.length === 0) {
            // First punch of the day -> Clock In
            const policyRes = await db.query('SELECT work_start_time FROM attendance_policies ORDER BY id LIMIT 1');
            const policy = policyRes.rows[0] || { work_start_time: '08:30:00' };
            const { calculateLateMinutes } = require('../utils/attendance.utils');
            const lateMinutes = calculateLateMinutes(punchTime, policy.work_start_time);
            const statusToSet = lateMinutes > 0 ? 'Late' : 'Incomplete';

            result = await db.query(
                `INSERT INTO attendance (employee_id, date, clock_in, status, source, device_id, late_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [employee.id, punchDate, punchTime, statusToSet, 'Biometric', device.device_name, lateMinutes]
            );
            console.log(`[BIOMETRIC] Employee ${employee.id} Clocked-In (New) at ${punchTime} - Status: ${statusToSet}`);
        } else {
            // Subsequent punch -> Update Clock Out to the latest punch
            // PROTECTION: If source is NOT 'Biometric', it means it was manually edited. DO NOT OVERWRITE.
            const existing = existingAttendance.rows[0];
            const ALLOWED_SOURCES = ['Biometric', 'Biometric-ADMS', 'System Sync', null];
            
            if (!ALLOWED_SOURCES.includes(existing.source)) {
                console.log(`[BIOMETRIC] Skipping update for Employee ${employee.id} on ${punchDate} because record source is '${existing.source}' (Manual Protected)`);
                result = { rows: [existing] };
                await db.query('COMMIT');
                return res.status(200).json({
                    message: 'Punch ignored (Manual record protected)',
                    attendance: existing
                });
            }

            // PROTECTION 2: Check for pending changes
            const pendingCheck = await db.query(
                "SELECT id FROM pending_changes WHERE entity = 'attendance' AND entity_id = $1 AND status = 'Pending'",
                [existing.id]
            );
            if (pendingCheck.rows.length > 0) {
                console.log(`[BIOMETRIC] Skipping update for Employee ${employee.id} on ${punchDate} because a correction is pending approval`);
                result = { rows: [existing] };
                await db.query('COMMIT');
                return res.status(200).json({
                    message: 'Punch ignored (Correction pending approval)',
                    attendance: existing
                });
            }

            // DEBOUNCE LOGIC: Only update if the new punch is at least 30 minutes after clock_in
            let shouldUpdate = false;
            let diffMins = 0;

            if (existing.clock_in) {
                // Handle existing.clock_in which might be "HH:mm:ss" or "HH:mm:ss+HH"
                const [h, m, s] = existing.clock_in.split(':');
                const clockInTime = new Date(pDate); // Use same date as punch
                clockInTime.setHours(parseInt(h), parseInt(m), parseInt(s.split('.')[0]), 0);
                
                const currentPunchTime = pDate;
                const diffMs = Math.abs(currentPunchTime - clockInTime);
                diffMins = diffMs / (1000 * 60);
                
                if (diffMins > 30) {
                    shouldUpdate = true;
                } else {
                    console.log(`[BIOMETRIC] Ignored double-tap for Employee ${employee.id} (Only ${Math.round(diffMins)} mins since Clock-In)`);
                    result = { rows: [existing] };
                }
            } else {
                // Placeholder record with no clock_in -> Always update and treat as first punch
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                const policyRes = await db.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
                const policy = policyRes.rows[0] || { work_start_time: '08:30:00', work_end_time: '16:31:00' };
                const { calculateLateMinutes } = require('../utils/attendance.utils');

                if (existing.clock_in) {
                    // Subsequent punch -> Clock Out
                    // New Goal: Only promote to 'Present' if IN was on-time AND OUT is on-time
                    result = await db.query(
                        `UPDATE attendance 
                         SET clock_out = GREATEST(COALESCE(clock_out, '00:00:00'), $1),
                             status = CASE 
                                 WHEN status = 'Incomplete' AND $1 >= $3 THEN 'Present'
                                 ELSE status 
                             END,
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE id = $2 RETURNING *`,
                        [punchTime, existing.id, policy.work_end_time]
                    );
                    console.log(`[BIOMETRIC] Employee ${employee.id} Clocked-Out/Updated at ${punchTime}`);
                } else {
                    // Placeholder fill -> Clock In
                    const lateMinutes = calculateLateMinutes(punchTime, policy.work_start_time);

                    result = await db.query(
                        `UPDATE attendance 
                         SET clock_in = $1, 
                             status = CASE WHEN $3 > 0 THEN 'Late' ELSE 'Incomplete' END,
                             late_minutes = $3,
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE id = $2 RETURNING *`,
                        [punchTime, existing.id, lateMinutes]
                    );
                    console.log(`[BIOMETRIC] Employee ${employee.id} Clocked-In (Placeholder) at ${punchTime} - Status: ${lateMinutes > 0 ? 'Late' : 'Incomplete'}`);
                }
            }
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
                    const ALLOWED_SOURCES = ['Biometric', 'Biometric-USB', 'Biometric-ADMS', 'System Sync', null];

                    // PROTECTION: Only update if existing record is from Biometric source
                    if (ALLOWED_SOURCES.includes(existing.source)) {
                        // PROTECTION 2: Check for pending changes
                        const pendingCheck = await client.query(
                            "SELECT id FROM pending_changes WHERE entity = 'attendance' AND entity_id = $1 AND status = 'Pending'",
                            [existing.id]
                        );
                        if (pendingCheck.rows.length > 0) {
                            console.log(`[BULK] Skipping Record ID ${existing.id}: Correction pending approval`);
                            continue;
                        }

                        // If this punch is much later than the current clock_out, update clock_out.
                        // Or simply update clock_out to the maximum time for that day.
                        await client.query(
                            `UPDATE attendance 
                             SET clock_out = GREATEST(COALESCE(clock_out, '00:00:00'), $1),
                                 updated_at = CURRENT_TIMESTAMP 
                             WHERE id = $2`,
                            [punchTimeStr, existing.id]
                        );
                    } else {
                        console.log(`[BULK-BIOMETRIC] Skipping update for record ${existing.id} (Source: ${existing.source})`);
                    }
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

/**
 * @desc    Manually trigger a biometric sync from the registered device (LAN pull)
 * @route   POST /api/biometric/sync-device
 * @access  Private (Admin / HR Manager)
 */
const { spawn } = require('child_process');
const path = require('path');

const triggerDeviceSync = async (req, res) => {
    const syncScriptPath = path.join(__dirname, '..', 'local_sync.js');
    console.log('[BIOMETRIC] Manual sync triggered by user:', req.user?.name);

    // Run local_sync.js as a one-shot (not the interval version)
    // We pass a flag so local_sync runs once and exits
    const child = spawn('node', [syncScriptPath, '--once'], {
        cwd: path.join(__dirname, '..'),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { errorOutput += data.toString(); });

    // Wait up to 40 seconds for one-shot sync to complete
    const timeoutMs = 40000;
    const result = await new Promise((resolve) => {
        const timer = setTimeout(() => {
            child.kill();
            resolve({ success: false, message: 'Device sync timed out after 40s. Device may be offline or unreachable.' });
        }, timeoutMs);

        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0 || output.includes('Sync iteration finished')) {
                const match = output.match(/(\d+) New, (\d+) Existing, (\d+) Errors/);
                const summary = match
                    ? `✅ Sync complete: ${match[1]} new records, ${match[2]} already synced, ${match[3]} errors.`
                    : '✅ Sync complete.';
                resolve({ success: true, message: summary, log: output });
            } else {
                resolve({ success: false, message: `Sync failed (exit code ${code}). ${errorOutput || output}` });
            }
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({ success: false, message: `Could not start sync: ${err.message}` });
        });
    });

    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
};

module.exports = { processPunch, bulkProcessPunches, registerDevice, getDevices, deleteDevice, triggerDeviceSync };

