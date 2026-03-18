/**
 * ZKTeco ADMS (iclock/cdata) Controller
 * 
 * ZKTeco devices use a simple HTTP push protocol:
 * 1. Device sends: GET /iclock/cdata?SN=DEVICE_SERIAL&options=all
 * 2. Server replies with: GET OPTION FROM ... (device settings config)
 * 3. Device sends: POST /iclock/cdata?SN=DEVICE_SERIAL (attendance data in body)
 * 4. Server replies with: OK
 *
 * Attendance format in POST body:
 * "ATTLOG\tUSERID\tTIMESTAMP\tSTATUS\tVERIFY\tWORKCODE\n"
 * e.g. "ATTLOG\t101\t2026-03-17 08:30:00\t0\t1\t0\n"
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { calculateLateMinutes, calculateOvertimeHours } = require('../utils/attendance.utils');

// Log file path for debugging
const LOG_FILE = path.join(__dirname, '..', 'iclock.log');

function writeLog(msg) {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
    const line = `[${timestamp}] ${msg}\n`;
    console.log('[ICLOCK]', msg);
    try {
        fs.appendFileSync(LOG_FILE, line);
    } catch (e) {}
}

/**
 * GET /iclock/cdata
 * Device initiates connection handshake.
 * We respond with configuration telling the device where to push data.
 */
const handleInitHandshake = (req, res) => {
    const sn = req.query.SN || 'UNKNOWN';
    writeLog(`Device handshake from SN: ${sn}`);

    // ZKTeco expects a specific plain-text response
    // STAMP = last sync time (0 means send all)
    // ATT_LOG = 1 means send attendance logs
    // OPERLOG = 0 means we don't need operational logs
    const responseText = [
        'GET OPTION FROM: ' + sn,
        'ATTLOGStamp=0',
        'OPERLOGStamp=9999999999',
        'ATTPHOTOStamp=None',
        'ErrorDelay=30',
        'Delay=10',
        'TransTimes=00:00;14:05',
        'TransInterval=1',
        'TransFlag=TransData AttLog',
        'Realtime=1',
        'Encrypt=None'
    ].join('\n');

    res.set('Content-Type', 'text/plain');
    res.status(200).send(responseText);
};

/**
 * POST /iclock/cdata?SN=XXXX&table=ATTLOG
 * Device pushes attendance log lines.
 * Body format (text/plain): "ATTLOG\tUSERID\tDATETIME\tSTATUS\tVERIFY\tWORKCODE\n"
 */
const handleAttendancePush = async (req, res) => {
    const sn = req.query.SN || 'UNKNOWN';
    let body = '';

    // Collect raw body (it comes as text, not JSON)
    if (typeof req.body === 'string') {
        body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
        body = req.body.toString('utf8');
    } else {
        body = String(req.body || '');
    }

    writeLog(`Push from SN: ${sn}, Body length: ${body.length} chars`);

    // Parse each line
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('ATTLOG'));

    if (lines.length === 0) {
        // Handle other table types (OPERLOG, etc.) - just acknowledge
        writeLog(`No ATTLOG lines found. Acknowledging.`);
        res.set('Content-Type', 'text/plain');
        return res.status(200).send('OK');
    }

    writeLog(`Processing ${lines.length} attendance records from device ${sn}`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const line of lines) {
        // Format: ATTLOG\tUSERID\tDATETIME\tSTATUS\tVERIFY\tWORKCODE
        const parts = line.split('\t');
        if (parts.length < 3) { skipCount++; continue; }

        const userId = parts[1].trim();
        const rawDateTime = parts[2].trim(); // e.g. "2026-03-17 08:30:00"

        if (!userId || !rawDateTime) { skipCount++; continue; }

        try {
            // Parse datetime: "2026-03-17 08:30:00"
            const pDate = new Date(rawDateTime.replace(' ', 'T'));
            if (isNaN(pDate.getTime())) {
                writeLog(`Invalid date: "${rawDateTime}" for user ${userId}`);
                skipCount++;
                continue;
            }

            const punchDate = pDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const hrs = String(pDate.getHours()).padStart(2, '0');
            const mins = String(pDate.getMinutes()).padStart(2, '0');
            const secs = String(pDate.getSeconds()).padStart(2, '0');
            const punchTime = `${hrs}:${mins}:${secs}`;

            // Get employee by biometric_id
            const empRes = await db.query(
                'SELECT id FROM employees WHERE biometric_id = $1',
                [userId]
            );

            if (empRes.rows.length === 0) {
                writeLog(`No employee mapped to biometric_id: ${userId}`);
                skipCount++;
                continue;
            }

            const employeeId = empRes.rows[0].id;

            // Fetch Policy for calculations
            const policyRes = await db.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
            const policy = policyRes.rows[0];

            // Check for existing attendance
            const existingRes = await db.query(
                'SELECT id, clock_in, clock_out, status, source FROM attendance WHERE employee_id = $1 AND date = $2',
                [employeeId, punchDate]
            );

            const ALLOWED_SOURCES = ['Biometric', 'Biometric-ADMS', 'System Sync', null];

            if (existingRes.rows.length === 0) {
                // First punch of the day → New Record
                let lateMinutes = 0;
                if (policy) {
                    lateMinutes = calculateLateMinutes(punchTime, policy.work_start_time);
                }
                const statusToSet = lateMinutes > 0 ? 'Late' : 'Incomplete';

                await db.query(
                    `INSERT INTO attendance (employee_id, date, clock_in, status, source, device_id, late_minutes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT DO NOTHING`,
                    [employeeId, punchDate, punchTime, statusToSet, 'Biometric-ADMS', sn, lateMinutes]
                );
                writeLog(`Clock-IN (New): Employee ${employeeId} at ${punchDate} ${punchTime}`);
            } else {
                const existing = existingRes.rows[0];

                // PROTECTION: Skip automated update if record was manually edited
                if (!ALLOWED_SOURCES.includes(existing.source)) {
                    writeLog(`Skipping update for ${employeeId}: Manual record protected (${existing.source})`);
                    successCount++;
                    continue;
                }

                // PROTECTION 2: Skip if there's a pending change for this record
                const pendingCheck = await db.query(
                    "SELECT id FROM pending_changes WHERE entity = 'attendance' AND entity_id = $1 AND status = 'Pending'",
                    [existing.id]
                );
                if (pendingCheck.rows.length > 0) {
                    writeLog(`Skipping update for ${employeeId}: Manual correction pending approval`);
                    successCount++;
                    continue;
                }
                
                // CASE 1: Existing record is a placeholder or has no clock_in
                if (!existing.clock_in || existing.status === 'Absent') {
                    let lateMinutes = 0;
                    if (policy) {
                        lateMinutes = calculateLateMinutes(punchTime, policy.work_start_time);
                    }
                    const statusToSet = lateMinutes > 0 ? 'Late' : 'Incomplete';

                    await db.query(
                        `UPDATE attendance 
                         SET clock_in = $1, 
                             status = $2, 
                             source = $3, 
                             device_id = $4,
                             late_minutes = $5,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $6`,
                        [punchTime, statusToSet, 'Biometric-ADMS', sn, lateMinutes, existing.id]
                    );
                    writeLog(`Clock-IN (Update Placeholder): Employee ${employeeId} at ${punchDate} ${punchTime}`);
                } 
                // CASE 2: Already has clock_in, update clock_out
                else {
                    // Parse existing clock_in time for debounce check
                    // clock_in might be "HH:mm:ss" or with fractional seconds
                    const clockInStr = existing.clock_in.split('.')[0]; 
                    const [h, m, s] = clockInStr.split(':');
                    
                    const clockInBase = new Date(pDate);
                    clockInBase.setHours(parseInt(h), parseInt(m), parseInt(s || '0'), 0);

                    const diffMins = Math.abs(pDate - clockInBase) / (1000 * 60);

                    // Only update clock_out if the new punch is at least 30 minutes later
                    if (diffMins > 30) {
                        let overtimeHours = 0;
                        if (policy && policy.work_end_time) {
                            overtimeHours = calculateOvertimeHours(punchTime, policy.work_end_time);
                        }

                        await db.query(
                            `UPDATE attendance
                             SET clock_out = GREATEST(COALESCE(clock_out, '00:00:00'), $1),
                                 status = CASE 
                                     WHEN status = 'Incomplete' AND $1 >= $4 THEN 'Present'
                                     ELSE status 
                                 END,
                                 overtime_hours = $2,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE id = $3`,
                            [punchTime, overtimeHours, existing.id, policy.work_end_time]
                        );
                        writeLog(`Clock-OUT: Employee ${employeeId} at ${punchDate} ${punchTime} (${Math.round(diffMins)} mins gap)`);
                    } else {
                        writeLog(`Debounce skip: Employee ${employeeId}, only ${Math.round(diffMins)} mins since clock-in`);
                    }
                }
            }
            successCount++;
        } catch (err) {
            writeLog(`Error processing record for userId ${userId}: ${err.message}`);
            errorCount++;
        }
    }

    writeLog(`Done: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);

    // ZKTeco expects "OK" to confirm receipt
    res.set('Content-Type', 'text/plain');
    res.status(200).send('OK');
};

/**
 * GET /iclock/getrequest
 * Device polls for any pending commands from the server (e.g., add user).
 * Return "OK" if nothing to do.
 */
const handleGetRequest = (req, res) => {
    const sn = req.query.SN || 'UNKNOWN';
    writeLog(`Device command poll from SN: ${sn}`);
    res.set('Content-Type', 'text/plain');
    res.status(200).send('OK');
};

/**
 * POST /iclock/devicecmd
 * Device acknowledges a command we sent. Return "OK".
 */
const handleDeviceCmd = (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.status(200).send('OK');
};

module.exports = {
    handleInitHandshake,
    handleAttendancePush,
    handleGetRequest,
    handleDeviceCmd
};
