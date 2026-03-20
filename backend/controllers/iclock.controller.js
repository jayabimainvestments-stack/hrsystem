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
const { calculateLateMinutes } = require('../utils/attendance.utils');
const { initializeDailyAbsences, processAttendanceFromPunches } = require('../services/attendance.service');

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

    if (typeof req.body === 'string') {
        body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
        body = req.body.toString('utf8');
    } else {
        body = String(req.body || '');
    }

    writeLog(`Push from SN: ${sn}, Body length: ${body.length} chars`);

    const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('ATTLOG'));

    if (lines.length === 0) {
        res.set('Content-Type', 'text/plain');
        return res.status(200).send('OK');
    }

    writeLog(`Processing ${lines.length} attendance records from device ${sn}`);

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const affectedEmployeesAndDates = new Set();
        const datesToInitialize = new Set();

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 3) continue;

            const biometricId = parts[1].trim();
            const rawDateTime = parts[2].trim();

            const pDate = new Date(rawDateTime.replace(' ', 'T'));
            if (isNaN(pDate.getTime())) continue;

            const punchDate = pDate.toISOString().split('T')[0];
            const punchTime = pDate.toTimeString().split(' ')[0]; // HH:mm:ss

            // 1. Audit: Insert into biometric_punches
            await client.query(
                `INSERT INTO biometric_punches (biometric_id, punch_time, punch_date, device_sn)
                 VALUES ($1, $2, $3, $4)`,
                [biometricId, punchTime, punchDate, sn]
            );

            // 2. Identify employee
            const empRes = await client.query('SELECT id FROM employees WHERE biometric_id = $1', [biometricId]);
            if (empRes.rows.length > 0) {
                const employeeId = empRes.rows[0].id;
                affectedEmployeesAndDates.add(JSON.stringify({ employeeId, punchDate }));
                datesToInitialize.add(punchDate);
            }
        }

        // 3. Auto-Initialize Absences for new dates encountered
        for (const dateStr of datesToInitialize) {
            await initializeDailyAbsences(client, dateStr);
        }

        // 4. Process processed records from raw punches
        for (const itemStr of affectedEmployeesAndDates) {
            const { employeeId, punchDate } = JSON.parse(itemStr);
            await processAttendanceFromPunches(client, employeeId, punchDate);
        }

        await client.query('COMMIT');
        writeLog(`Successfully processed ${lines.length} logs and updated attendance registry.`);
    } catch (err) {
        await client.query('ROLLBACK');
        writeLog(`Error in handleAttendancePush: ${err.message}`);
    } finally {
        client.release();
    }

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
