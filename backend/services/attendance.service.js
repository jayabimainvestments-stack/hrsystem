/**
 * Helper to restore leave balance if employee works during an approved leave
 */
const reconcileLeaveBalance = async (client, employeeId, date, status) => {
    // Only working statuses trigger reconciliation
    if (status !== 'Present' && status !== 'Late') return false;

    try {
        // Find overlapping APPROVED leave for this employee
        const leaveRes = await client.query(`
            SELECT l.* FROM leaves l
            JOIN employees e ON e.user_id = l.user_id
            WHERE e.id = $1 
            AND l.status = 'Approved'
            AND $2::date BETWEEN l.start_date AND l.end_date
            LIMIT 1
        `, [employeeId, date]);

        if (leaveRes.rows.length === 0) return false;

        const leave = leaveRes.rows[0];

        // If this was a paid day, restore balance
        if (parseFloat(leave.paid_days) > 0) {
            const year = new Date(leave.start_date).getFullYear();

            // Restore appropriate amount (usually 1.0, but 0.5 for Half Day)
            const restoreAmount = Math.min(1.0, parseFloat(leave.no_of_days));

            await client.query(`
                UPDATE leave_balances 
                SET used_days = used_days - $1
                WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
            `, [restoreAmount, leave.user_id, leave.leave_type_id, year]);

            console.log(`[RECONCILE] Restored ${restoreAmount} day(s) to balance for User ${leave.user_id} (Leave ID: ${leave.id}) due to work on ${date}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Reconcile Error:', error);
        return false;
    }
};

/**
 * Helper to reverse reclamation (if attendance is deleted or changed to non-working)
 */
const reverseReclaimedBalance = async (client, attendanceId) => {
    try {
        const attRes = await client.query('SELECT * FROM attendance WHERE id = $1', [attendanceId]);
        if (attRes.rows.length === 0 || !attRes.rows[0].leave_reclaimed) return;

        const att = attRes.rows[0];

        // Find the leave record that was overlapping
        const leaveRes = await client.query(`
            SELECT l.* FROM leaves l
            JOIN employees e ON e.user_id = l.user_id
            WHERE e.id = $1 
            AND l.status = 'Approved'
            AND $2::date BETWEEN l.start_date AND l.end_date
            LIMIT 1
        `, [att.employee_id, att.date]);

        if (leaveRes.rows.length > 0) {
            const leave = leaveRes.rows[0];
            const year = new Date(leave.start_date).getFullYear();
            const restoreAmount = Math.min(1.0, parseFloat(leave.no_of_days));

            // Re-deduct
            await client.query(`
                UPDATE leave_balances 
                SET used_days = used_days + $1
                WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
            `, [restoreAmount, leave.user_id, leave.leave_type_id, year]);

            console.log(`[REVERSE] Deducted ${restoreAmount} day(s) from balance for User ${leave.user_id} (Leave ID: ${leave.id}) because attendance on ${att.date} was removed/changed`);
        }
    } catch (error) {
        console.error('Reverse Reconciliation Error:', error);
    }
};

/**
 * Initializes 'Absent' records for all active employees for the given date.
 * Skips weekends and employees who already have an attendance record.
 */
const initializeDailyAbsences = async (client, dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { message: 'Skipping weekend initialization' };
    }

    try {
        // 1. Get all active employees without an attendance record for this date
        const empRes = await client.query(`
            SELECT e.id 
            FROM employees e
            WHERE e.employment_status = 'Active'
            AND NOT EXISTS (
                SELECT 1 FROM attendance a 
                WHERE a.employee_id = e.id AND a.date = $1
            )
        `, [dateStr]);

        if (empRes.rows.length === 0) return { message: 'No employees to initialize' };

        const employees = empRes.rows;
        let count = 0;

        for (const emp of employees) {
            // Check for approved leave — if they have one, syncAttendanceWithLeaves should handle it
            // but for initialization, we can just mark as Absent and let the spectrum query handle leaves.
            // OR we can check for leave here to be cleaner.
            const leaveCheck = await client.query(`
                SELECT id FROM leaves 
                WHERE user_id = (SELECT user_id FROM employees WHERE id = $1)
                AND status = 'Approved'
                AND $2::date BETWEEN start_date AND end_date
            `, [emp.id, dateStr]);

            const status = leaveCheck.rows.length > 0 ? 'Leave' : 'Absent';

            await client.query(`
                INSERT INTO attendance (employee_id, date, status, source)
                VALUES ($1, $2, $3, 'System Init')
                ON CONFLICT DO NOTHING
            `, [emp.id, dateStr, status]);
            count++;
        }

        return { message: `Initialized ${count} attendance records`, count };
    } catch (error) {
        console.error('Initialization Error:', error);
        throw error;
    }
};

/**
 * Processes attendance for an employee on a specific date based on raw biometric punches.
 * Consolidates first/last punch into clock_in/clock_out.
 * Calculates late_minutes and short_leave_hours.
 * Protects manual edits (source check).
 */
const { calculateLateMinutes, calculateEarlyDepartureMinutes } = require('../utils/attendance.utils');

const processAttendanceFromPunches = async (client, employeeId, dateStr) => {
    try {
        // 1. Fetch all punches for this employee and date
        const punchRes = await client.query(`
            SELECT punch_time FROM biometric_punches 
            WHERE biometric_id = (SELECT biometric_id FROM employees WHERE id = $1)
            AND punch_date = $2
            ORDER BY punch_time ASC
        `, [employeeId, dateStr]);

        if (punchRes.rows.length === 0) return;

        const punches = punchRes.rows.map(r => r.punch_time);
        const clockIn = punches[0];
        const clockOut = punches.length > 1 ? punches[punches.length - 1] : null;

        // 2. Load Policy
        const policyRes = await client.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];

        // 3. Calculation
        let lateMinutes = 0;
        let earlyDepartureMinutes = 0;
        if (policy) {
            lateMinutes = calculateLateMinutes(clockIn, policy.work_start_time);
            if (clockOut) {
                earlyDepartureMinutes = calculateEarlyDepartureMinutes(clockOut, policy.work_end_time);
            }
        }

        const shortLeaveHours = parseFloat((earlyDepartureMinutes / 60).toFixed(2));

        // 4. Status Determination (Strict Logic)
        let status = 'Incomplete';
        if (clockIn && clockOut) {
            const isLate = lateMinutes > 0;
            const isEarly = earlyDepartureMinutes > 0;

            if (!isLate && !isEarly) {
                status = 'Present';
            } else {
                status = 'Incomplete';
            }
        } else {
            status = 'Incomplete';
        }

        // 5. Update Attendance (with Protection)
        const existingRes = await client.query(
            'SELECT id, source, leave_reclaimed FROM attendance WHERE employee_id = $1 AND date = $2',
            [employeeId, dateStr]
        );

        const ALLOWED_SOURCES = ['Biometric', 'Biometric-ADMS', 'System Sync', 'System Init', 'System-Init', null];

        if (existingRes.rows.length > 0) {
            const existing = existingRes.rows[0];
            
            // PROTECTION: Skip if record was manually edited
            if (!ALLOWED_SOURCES.includes(existing.source)) {
                console.log(`[PROCESS] Skipping ${employeeId} on ${dateStr}: Manual record protected (${existing.source})`);
                return;
            }

            // Leave Reconciliation for the new status
            const isWorkingStatus = status === 'Present' || status === 'Late';
            let reclaimed = existing.leave_reclaimed;
            if (isWorkingStatus && !existing.leave_reclaimed) {
                const { reconcileLeaveBalance } = require('./attendance.service'); // circular safety
                reclaimed = await reconcileLeaveBalance(client, employeeId, dateStr, status);
            }

            await client.query(`
                UPDATE attendance 
                SET clock_in = $1, 
                    clock_out = $2, 
                    raw_clock_in = $1,
                    raw_clock_out = $2,
                    status = $3, 
                    late_minutes = $4, 
                    short_leave_hours = $5,
                    source = 'Biometric-ADMS',
                    leave_reclaimed = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
            `, [clockIn, clockOut, status, lateMinutes, shortLeaveHours, reclaimed, existing.id]);
        } else {
            // New Record (unlikely with 5AM init, but safety first)
            await client.query(`
                INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, late_minutes, short_leave_hours, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'Biometric-ADMS')
            `, [employeeId, dateStr, clockIn, clockOut, status, lateMinutes, shortLeaveHours]);
        }

    } catch (error) {
        console.error('Process attendance Error:', error);
        throw error;
    }
};

module.exports = {
    reconcileLeaveBalance,
    reverseReclaimedBalance,
    initializeDailyAbsences,
    processAttendanceFromPunches
};
