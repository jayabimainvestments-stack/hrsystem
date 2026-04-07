const db = require('../config/db');
const { calculateLateMinutes, calculateEarlyDepartureMinutes } = require('../utils/attendance.utils');

const { reconcileLeaveBalance, reverseReclaimedBalance } = require('../services/attendance.service');

// @desc    Log attendance (Manual or Device)
// @route   POST /api/attendance
// @access  Private (MANAGE_ATTENDANCE or Device Key)
const logAttendance = async (req, res) => {
    let { employee_id, date, clock_in, clock_out, status, source } = req.body;

    // Convert empty strings to null for time columns
    if (clock_in === '') clock_in = null;
    if (clock_out === '') clock_out = null;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const existingRes = await client.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [employee_id, date]
        );

        // Fetch Policy
        const policyRes = await client.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];
        let lateMinutes = 0;
        let earlyDepartureMinutes = 0;

        if (clock_in && policy) {
            lateMinutes = calculateLateMinutes(clock_in, policy.work_start_time);
        }
        if (clock_out && policy) {
            earlyDepartureMinutes = calculateEarlyDepartureMinutes(clock_out, policy.work_end_time);
        }

        const shortLeaveHours = parseFloat((earlyDepartureMinutes / 60).toFixed(2));

        let statusToSet = status;
        if (clock_in && clock_out) {
            // Updated: Status is Present if both punches exist. 
            // Lateness is tracked in late_minutes, but shouldn't trigger 'Incomplete' (which causes 0.5 day penalty)
            statusToSet = 'Present';
        } else if (clock_in || clock_out) {
            statusToSet = 'Incomplete';
        } else {
            statusToSet = status || 'Absent';
        }

        const isWorkingStatus = statusToSet === 'Present' || statusToSet === 'Late';
        let reclaimed = false;

        if (existingRes.rows.length > 0) {
            const existingRec = existingRes.rows[0];
            if (isWorkingStatus && !existingRec.leave_reclaimed) {
                reclaimed = await reconcileLeaveBalance(client, employee_id, date, statusToSet);
            } else if (!isWorkingStatus && existingRec.leave_reclaimed) {
                await reverseReclaimedBalance(client, existingRec.id);
                reclaimed = false;
            } else {
                reclaimed = existingRec.leave_reclaimed;
            }

            const result = await client.query(
                `UPDATE attendance 
                 SET clock_in = COALESCE($1, clock_in),
                     clock_out = COALESCE($2, clock_out),
                     status = COALESCE($3, status),
                     late_minutes = $5,
                     short_leave_hours = $6,
                     raw_clock_in = $1,
                     raw_clock_out = $2,
                     leave_reclaimed = $7,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $8 RETURNING *`,
                [clock_in, clock_out, statusToSet, source, lateMinutes, shortLeaveHours, reclaimed, existingRec.id]
            );
            await client.query('COMMIT');
            res.status(200).json(result.rows[0]);
        } else {
            // New record
            if (isWorkingStatus) {
                reclaimed = await reconcileLeaveBalance(client, employee_id, date, statusToSet);
            }

            const result = await client.query(
                `INSERT INTO attendance (employee_id, date, clock_in, clock_out, raw_clock_in, raw_clock_out, status, source, late_minutes, short_leave_hours, leave_reclaimed)
                 VALUES ($1, $2, $3, $4, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [employee_id, date, clock_in, clock_out, statusToSet, source || 'Manual', lateMinutes, shortLeaveHours, reclaimed]
            );
            await client.query('COMMIT');
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Log Attendance Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Get current user's attendance
// @route   GET /api/attendance/my
// @access  Private-Protected (Employees)
const getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        // Default to current month if no dates provided
        let dateFilter = '';
        const params = [userId];

        if (startDate && endDate) {
            dateFilter = 'AND a.date >= $2 AND a.date <= $3';
            params.push(startDate, endDate);
        } else {
            // Default: Last 45 days (coincides with full monthly payroll cycles)
            dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '45 days'";
        }

        const query = `
            SELECT 
                a.id, a.date::date, 
                a.clock_in::text, a.clock_out::text, 
                a.raw_clock_in::text, a.raw_clock_out::text,
                a.status, a.late_minutes
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE e.user_id = $1 ${dateFilter}
            ORDER BY a.date DESC
        `;

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance logs
// @route   GET /api/attendance
// @access  Private (VIEW_ATTENDANCE)
const getAttendance = async (req, res) => {
    const { date, employee_id, startDate, endDate, department } = req.query;

    // Direct Materialized Query: Read directly from physical attendance logs.
    // Leaves are now expected to be materialized into this table.
    let query = `
        SELECT 
            a.id::text, a.employee_id, a.date::date, 
            a.clock_in::text, a.clock_out::text, 
            a.raw_clock_in::text, a.raw_clock_out::text,
            a.status, a.source, 
            e.designation, u.name as employee_name, e.department
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        JOIN users u ON e.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        params.push(date);
        query += ` AND a.date = $${params.length}`;
    } else if (startDate && endDate) {
        const startIdx = params.length + 1;
        const endIdx = params.length + 2;
        params.push(startDate, endDate);
        query += ` AND a.date BETWEEN $${startIdx} AND $${endIdx}`;
    }

    if (employee_id) {
        params.push(employee_id);
        query += ` AND a.employee_id = $${params.length}`;
    }
    if (department) {
        params.push(department);
        query += ` AND e.department = $${params.length}`;
    }

    query += ` ORDER BY a.date DESC, u.name ASC`;

    try {
        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('+++ CRITICAL: getAttendance Spectrum SQL Error +++', {
            message: error.message,
            stack: error.stack,
            params: params
        });
        res.status(500).json({
            message: 'Internal Spectrum Query Error: ' + error.message,
            code: error.code
        });
    }
};

// @desc    Update attendance record via HR override
// @route   PUT /api/attendance/:id
// @access  Private (MANAGE_ATTENDANCE)
const updateAttendance = async (req, res) => {
    let { clock_in, clock_out, status } = req.body;
    
    // Convert empty strings to null for time columns
    if (clock_in === '') clock_in = null;
    if (clock_out === '') clock_out = null;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get existing to check for reconciliation reversal
        const existingRes = await client.query('SELECT * FROM attendance WHERE id = $1', [req.params.id]);
        if (existingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Record not found' });
        }
        const existing = existingRes.rows[0];

        // Fetch Policy to recalculate late minutes
        const policyRes = await client.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];
        let lateMinutes = 0;

        if (clock_in && policy) {
            lateMinutes = calculateLateMinutes(clock_in, policy.work_start_time);
        }

        let shortLeaveHours = 0;
        if (clock_out && policy) {
            const earlyDepartureMinutes = calculateEarlyDepartureMinutes(clock_out, policy.work_end_time);
            shortLeaveHours = parseFloat((earlyDepartureMinutes / 60).toFixed(2));
        }

        let statusToSet = status;
        if (clock_in && clock_out) {
            statusToSet = 'Present';
        } else if (clock_in || clock_out) {
            statusToSet = 'Incomplete';
        } else {
            statusToSet = 'Absent';
        }

        // PENDING CHANGE (Mandatory for all per user request)
        const newValue = {
            clock_in,
            clock_out,
            status: statusToSet,
            late_minutes: lateMinutes,
            short_leave_hours: shortLeaveHours
        };

        await client.query(
            `INSERT INTO pending_changes (
                entity, entity_id, field_name, old_value, new_value, 
                requested_by, reason, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                'attendance',
                req.params.id,
                'Correction',
                existing.status,
                JSON.stringify(newValue),
                req.user.id,
                'HR Correction Request',
                'Pending'
            ]
        );

        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Attendance adjustment submitted for approval',
            pending: true
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update Attendance Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (MANAGE_ATTENDANCE)
const deleteAttendance = async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Reverse balance if it was reclaimed
        await reverseReclaimedBalance(client, req.params.id);

        await client.query('DELETE FROM attendance WHERE id = $1', [req.params.id]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Attendance record deleted' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete Attendance Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Get monthly attendance summary for all employees
// @route   GET /api/attendance/summary
// @access  Private (VIEW_ATTENDANCE)
const getMonthlySummary = async (req, res) => {
    const { month, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT 
                u.name, 
                e.id as employee_id,
                e.designation,
                e.department,
                COUNT(*) FILTER (WHERE a.status = 'Present') as present_days,
                COUNT(*) FILTER (WHERE a.status = 'Absent') as absent_days,
                COUNT(*) FILTER (WHERE a.late_minutes > 0 OR a.short_leave_hours > 0) as late_days,
                COUNT(*) FILTER (WHERE a.status = 'Incomplete') as incomplete_days,
                COUNT(*) FILTER (WHERE a.status = 'Leave') as leave_days
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN attendance a ON e.id = a.employee_id 
        `;
        const params = [];
        let dateCondition = '';

        if (startDate && endDate) {
            params.push(startDate, endDate);
            dateCondition = ` AND a.date >= $1 AND a.date <= $2`;
        } else if (month) {
            params.push(`${month}%`);
            dateCondition = ` AND a.date::text LIKE $${params.length}`;
        } else {
            return res.status(400).json({ message: 'Month or Date Range (startDate & endDate) is required' });
        }

        query += `${dateCondition} WHERE 1=1 `;

        if (req.query.department) {
            params.push(req.query.department);
            query += ` AND e.department = $${params.length}`;
        }

        if (req.query.employee_id) {
            params.push(req.query.employee_id);
            query += ` AND e.id = $${params.length}`;
        }

        query += `
            GROUP BY u.name, e.id, e.designation, e.department
            ORDER BY u.name ASC
        `;

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk log attendance (CSV Import)
// @route   POST /api/attendance/bulk
// @access  Private (MANAGE_ATTENDANCE)
const bulkLogAttendance = async (req, res) => {
    const { records } = req.body; // Expecting [{ employee_id, date, clock_in, clock_out, status, source }]
    if (!records || !Array.isArray(records)) return res.status(400).json({ message: 'Valid records array required' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];

        // Fetch Policy once for bulk
        const policyRes = await client.query('SELECT work_start_time, work_end_time FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];

        for (const rec of records) {
            const { employee_id, date, clock_in, clock_out, status, source } = rec;
            let lateMinutes = 0;

            if (clock_in && policy) {
                lateMinutes = calculateLateMinutes(clock_in, policy.work_start_time);
            }

            let statusToSet = status;
            if (clock_in && clock_out) {
                statusToSet = 'Present';
            } else if (clock_in || clock_out) {
                statusToSet = 'Incomplete';
            } else {
                statusToSet = 'Absent';
            }

            // Check if record exists
            const existing = await client.query(
                'SELECT id, leave_reclaimed FROM attendance WHERE employee_id = $1 AND date = $2',
                [employee_id, date]
            );

            const isWorkingStatus = statusToSet === 'Present' || statusToSet === 'Incomplete';
            let reclaimed = false;

            if (existing.rows.length > 0) {
                const existingRec = existing.rows[0];
                if (isWorkingStatus && !existingRec.leave_reclaimed) {
                    reclaimed = await reconcileLeaveBalance(client, employee_id, date, statusToSet);
                } else if (!isWorkingStatus && existingRec.leave_reclaimed) {
                    await reverseReclaimedBalance(client, existingRec.id);
                    reclaimed = false;
                } else {
                    reclaimed = existingRec.leave_reclaimed;
                }

                const res = await client.query(
                    `UPDATE attendance 
                     SET clock_in = COALESCE($1, clock_in),
                         clock_out = COALESCE($2, clock_out),
                         raw_clock_in = COALESCE(raw_clock_in, $1),
                         raw_clock_out = COALESCE(raw_clock_out, $2),
                         status = COALESCE($3, status),
                         source = CASE 
                                    WHEN source = 'System Sync' THEN COALESCE($4, 'Bulk Import')
                                    ELSE COALESCE($4, source)
                                  END,
                         late_minutes = $5,
                         leave_reclaimed = $6,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $7 RETURNING id`,
                    [clock_in, clock_out, statusToSet, source || 'Bulk Import', lateMinutes, reclaimed, existingRec.id]
                );
                results.push(res.rows[0].id);
            } else {
                if (isWorkingStatus) {
                    reclaimed = await reconcileLeaveBalance(client, employee_id, date, statusToSet);
                }

                const res = await client.query(
                    `INSERT INTO attendance (employee_id, date, clock_in, clock_out, raw_clock_in, raw_clock_out, status, source, late_minutes, leave_reclaimed)
                     VALUES ($1, $2, $3, $4, $3, $4, $5, $6, $7, $8) RETURNING id`,
                    [employee_id, date, clock_in, clock_out, statusToSet, source || 'Bulk Import', lateMinutes, reclaimed]
                );
                results.push(res.rows[0].id);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: `Successfully processed ${results.length} records`, count: results.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Synchronize attendance with leaves (Mark Absences vs Leaves)
// @route   POST /api/attendance/sync
// @access  Private (MANAGE_ATTENDANCE)
const syncAttendanceWithLeaves = async (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and End dates required' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all active employees
        const empRes = await client.query('SELECT e.id, e.user_id, u.name FROM employees e JOIN users u ON e.user_id = u.id');
        const employees = empRes.rows;

        // 2. Iterate through date range
        let current = new Date(startDate);
        const end = new Date(endDate);
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const results = { synced: 0, marked_absent: 0, marked_leave: 0 };

        while (current <= end) {
            // Local date string YYYY-MM-DD
            const dateStr = current.toLocaleDateString('en-CA');
            const dayOfWeek = current.getDay();

            // Skip weekends
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                for (const emp of employees) {
                    const attCheck = await client.query(
                        'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
                        [emp.id, dateStr]
                    );

                    if (attCheck.rows.length === 0) {
                        // Check for approved leave
                        const leaveCheck = await client.query(`
                            SELECT leave_type FROM leaves 
                            WHERE user_id = $1 AND status = 'Approved' 
                            AND $2::date BETWEEN start_date AND end_date
                        `, [emp.user_id, dateStr]);

                        if (leaveCheck.rows.length > 0) {
                            await client.query(
                                `INSERT INTO attendance (employee_id, date, status, source) 
                                 VALUES ($1, $2, 'Leave', 'System Sync')`,
                                [emp.id, dateStr]
                            );
                            results.marked_leave++;
                        } else {
                            // Proactive marking: Mark as Absent if the date is in the past OR if it's today
                            if (dateStr <= todayStr) {
                                await client.query(
                                    `INSERT INTO attendance (employee_id, date, status, source) 
                                     VALUES ($1, $2, 'Absent', 'System Sync')`,
                                    [emp.id, dateStr]
                                );
                                results.marked_absent++;
                            }
                        }
                    }
                }
            }
            current.setDate(current.getDate() + 1);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Attendance synchronization complete', results });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    logAttendance,
    getAttendance,
    updateAttendance,
    deleteAttendance,
    getMonthlySummary,
    bulkLogAttendance,
    getMyAttendance,
    syncAttendanceWithLeaves
};