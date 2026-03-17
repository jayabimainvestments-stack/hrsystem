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

            // Check for existing attendance
            const existingRes = await db.query(
                'SELECT id, clock_in FROM attendance WHERE employee_id = $1 AND date = $2',
                [employeeId, punchDate]
            );

            if (existingRes.rows.length === 0) {
                // First punch of the day → Clock-In
                await db.query(
                    `INSERT INTO attendance (employee_id, date, clock_in, source, device_id)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT DO NOTHING`,
                    [employeeId, punchDate, punchTime, 'Biometric-ADMS', sn]
                );
                writeLog(`Clock-IN: Employee ${employeeId} at ${punchDate} ${punchTime}`);
            } else {
                const existing = existingRes.rows[0];
                // Parse existing clock_in time for debounce check
                const [h, m, s] = existing.clock_in.split(':');
                const clockInBase = new Date(pDate);
                clockInBase.setHours(parseInt(h), parseInt(m), parseInt(s.split('.')[0] || '0'), 0);

                const diffMins = Math.abs(pDate - clockInBase) / (1000 * 60);

                // Only update clock_out if the new punch is at least 30 minutes later
                if (diffMins > 30) {
                    await db.query(
                        `UPDATE attendance
                         SET clock_out = GREATEST(COALESCE(clock_out, '00:00:00'), $1),
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [punchTime, existing.id]
                    );
                    writeLog(`Clock-OUT: Employee ${employeeId} at ${punchDate} ${punchTime} (${Math.round(diffMins)} mins gap)`);
                } else {
                    writeLog(`Debounce skip: Employee ${employeeId}, only ${Math.round(diffMins)} mins since clock-in`);
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
