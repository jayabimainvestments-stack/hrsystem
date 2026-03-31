const db = require('../config/db');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private (Employee)
const applyForLeave = async (req, res) => {
    console.log('--- START LEAVE APPLICATION ---');
    console.log('Request Body:', req.body);
    let { leave_type_id, start_date, end_date, reason, start_time, end_time } = req.body;

    if (!leave_type_id) {
        console.error('Missing leave_type_id');
        return res.status(400).json({ message: 'Leave type required' });
    }

    try {
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffTime = Math.abs(end - start);
        let noOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Fetch Leave Type early to adjust noOfDays
        const typeRes = await db.query('SELECT * FROM leave_types WHERE id = $1', [leave_type_id]);
        if (typeRes.rows.length === 0) {
            console.error(`Invalid leave type ID: ${leave_type_id}`);
            return res.status(400).json({ message: 'Invalid leave type' });
        }
        const leaveType = typeRes.rows[0];
        const typeName = (leaveType.name || '').trim().toUpperCase();

        if (typeName === 'HALF DAY') {
            noOfDays = 0.5;
        } else if (typeName === 'SHORT LEAVE') {
            noOfDays = 0;
        }

        const overlapCheck = await db.query(
            `SELECT * FROM leaves 
             WHERE user_id = $1 
             AND status != 'Rejected'
             AND (
                (start_date <= $2 AND end_date >= $2) OR
                (start_date <= $3 AND end_date >= $3) OR
                (start_date >= $2 AND end_date <= $3)
             )`,
            [req.user.id, start_date, end_date]
        );

        console.log(`Checking overlap for User ${req.user.id} from ${start_date} to ${end_date}`);

        if (overlapCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Leave request overlaps with an existing request' });
        }

        console.log('Leave Type Found:', leaveType);

        const currentYear = new Date(start_date).getFullYear();
        const currentMonth = new Date(start_date).toISOString().substring(0, 7); // YYYY-MM

        // 1.0.1 Enforce Advance Request for Annual Leave
        if (typeName === 'ANNUAL LEAVE') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const requestStart = new Date(start_date);
            requestStart.setHours(0, 0, 0, 0);

            if (requestStart <= today) {
                return res.status(400).json({
                    message: 'Annual leave must be requested at least 1 day in advance.'
                });
            }
        }

        // 1.1 Enforce Policy Limits (Short Leave / Half Day)
        const policyRes = await db.query('SELECT * FROM attendance_policies ORDER BY id LIMIT 1');
        const policy = policyRes.rows[0];

        if (typeName === 'SHORT LEAVE') {
            const shortLeaveRes = await db.query(
                `SELECT COUNT(*) FROM leaves WHERE user_id = $1 AND UPPER(TRIM(leave_type)) = 'SHORT LEAVE' 
                 AND status != 'Rejected' AND start_date::text LIKE $2`,
                [req.user.id, `${currentMonth}%`]
            );
            if (parseInt(shortLeaveRes.rows[0].count) >= (policy?.short_leave_monthly_limit || 2)) {
                return res.status(400).json({ message: `Short Leave limit reached (${policy?.short_leave_monthly_limit || 2} per month)` });
            }
        }

        if (typeName === 'HALF DAY') {
            const halfDayRes = await db.query(
                `SELECT COUNT(*) FROM leaves WHERE user_id = $1 AND UPPER(TRIM(leave_type)) = 'HALF DAY' 
                 AND status != 'Rejected' AND EXTRACT(YEAR FROM start_date) = $2`,
                [req.user.id, currentYear]
            );
            if (parseInt(halfDayRes.rows[0].count) >= (policy?.half_day_yearly_limit || 4)) {
                return res.status(400).json({ message: `Half Day limit reached (${policy?.half_day_yearly_limit || 4} per year)` });
            }
        }

        // 2. Fetch Balance
        const balanceRes = await db.query(
            'SELECT remaining_days FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
            [req.user.id, leave_type_id, currentYear]
        );
        console.log('Balance result:', balanceRes.rows);

        let paidDays = 0;
        let unpaidDays = 0;
        let isUnpaid = false;

        if (leaveType.is_paid) {
            const remaining = balanceRes.rows.length > 0 ? parseFloat(balanceRes.rows[0].remaining_days) : 0;
            if (remaining >= noOfDays) {
                paidDays = noOfDays;
                unpaidDays = 0;
            } else {
                paidDays = Math.max(0, remaining);
                unpaidDays = noOfDays - paidDays;
            }
        } else {
            paidDays = 0;
            unpaidDays = noOfDays;
            isUnpaid = true;
        }
        let shortLeaveHours = req.body.short_leave_hours || 0;
        if (start_time && end_time) {
            // Robust calculation helper logic (ideally would be in a shared util)
            const parseTime = (t) => {
                const m = t.match(/^(\d{1,2}):(\d{2})/);
                if (!m) return null;
                return parseInt(m[1]) * 60 + parseInt(m[2]);
            };
            const t1 = parseTime(start_time);
            const t2 = parseTime(end_time);
            if (t1 !== null && t2 !== null && t2 > t1) {
                shortLeaveHours = (t2 - t1) / 60;
            }
        }

        const result = await db.query(
            `INSERT INTO leaves 
             (user_id, leave_type_id, leave_type, start_date, end_date, no_of_days, paid_days, unpaid_days, is_unpaid, reason, short_leave_hours, start_time, end_time) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [req.user.id, leave_type_id, leaveType.name, start_date, end_date, noOfDays, paidDays, unpaidDays, isUnpaid, reason, shortLeaveHours, start_time || null, end_time || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
// @access  Private
const getMyLeaves = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT l.*, 
                   u.name as employee_name,
                   u.name, 
                   u.email,
                   approver.name as approved_by_name
            FROM leaves l 
            JOIN users u ON l.user_id = u.id 
            LEFT JOIN users approver ON l.approved_by = approver.id
            WHERE l.user_id = $1 
            ORDER BY l.created_at DESC
        `, [req.user.id]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all leaves (for Admin/HR)
// @route   GET /api/leaves
// @access  Private (Admin/HR)
const getAllLeaves = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT l.*, 
                   u.name, 
                   u.name as employee_name,
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                   u.email,
                   approver.name as approved_by_name
            FROM leaves l 
            JOIN users u ON l.user_id = u.id 
            LEFT JOIN employees e ON u.id = e.user_id
            LEFT JOIN users approver ON l.approved_by = approver.id
            ORDER BY l.created_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update leave status
// @route   PUT /api/leaves/:id
// @access  Private (Admin/HR)
const updateLeaveStatus = async (req, res) => {
    const { status } = req.body; // Approved, Rejected
    try {
        await db.query('BEGIN');

        // 1. Get current leave info
        const leaveRes = await db.query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
        if (leaveRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Leave record not found' });
        }
        const leave = leaveRes.rows[0];

        // 2. If approving, update balance and remove absences
        if (status === 'Approved' && leave.status !== 'Approved') {
            // Prevent self-approval
            if (String(leave.user_id) === String(req.user.id)) {
                await db.query('ROLLBACK');
                return res.status(400).json({ message: 'You cannot approve your own leave request' });
            }

            const year = new Date(leave.start_date).getFullYear();

            // Check if employee already worked on any of these days
            const employeeRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [leave.user_id]);
            let workedDays = 0;
            if (employeeRes.rows.length > 0) {
                const employeeId = employeeRes.rows[0].id;
                const workedRes = await db.query(`
                    SELECT COUNT(*) as worked_days FROM attendance 
                    WHERE employee_id = $1 
                    AND date >= $2::date 
                    AND date <= $3::date 
                    AND status IN ('Present', 'Incomplete')
                `, [employeeId, leave.start_date, leave.end_date]);
                workedDays = parseFloat(workedRes.rows[0].worked_days || 0);

                // Mark these as reclaimed so they don't get reclaimed again if updated
                if (workedDays > 0) {
                    await db.query(`
                        UPDATE attendance 
                        SET leave_reclaimed = TRUE
                        WHERE employee_id = $1 
                        AND date >= $2::date 
                        AND date <= $3::date 
                        AND status IN ('Present', 'Incomplete')
                    `, [employeeId, leave.start_date, leave.end_date]);
                }
            }

            const deduction = Math.max(0, parseFloat(leave.paid_days || 0) - workedDays);

            let balanceUpdate;
            if (deduction > 0) {
                balanceUpdate = await db.query(`
                    UPDATE leave_balances 
                    SET used_days = COALESCE(used_days, 0) + $1
                    WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
                `, [deduction, leave.user_id, leave.leave_type_id, year]);
            }

            console.log(`[APPROVE] Deducted ${deduction} day(s) for leave ${leave.id} (Original: ${leave.paid_days}, Already Worked: ${workedDays})`);

            if (balanceUpdate && balanceUpdate.rowCount === 0) {
                console.warn(`No leave balance record found for User: ${leave.user_id}, Type: ${leave.leave_type_id}, Year: ${year}. Skip balance update.`);
                // We might want to create one or allow approval anyway. 
                // For now, let's allow approval even if balance record is missing to avoid blocking HR.
            }

            // Delete absence records for the approved leave period
            const empResInApproval = await db.query('SELECT id FROM employees WHERE user_id = $1', [leave.user_id]);
            if (empResInApproval.rows.length > 0) {
                const employeeId = empResInApproval.rows[0].id;
                const deleteResult = await db.query(`
                    DELETE FROM attendance 
                    WHERE employee_id = $1 
                    AND date >= $2::date 
                    AND date <= $3::date 
                    AND status = 'Absent'
                `, [employeeId, leave.start_date, leave.end_date]);

                console.log(`Deleted ${deleteResult.rowCount} absence record(s) for approved leave (Employee: ${employeeId}, Dates: ${leave.start_date} to ${leave.end_date})`);
            }
        }

        const result = await db.query(
            'UPDATE leaves SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *',
            [status, req.user.id, req.params.id]
        );

        await db.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Update Leave Status Error:', error);
        await db.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    }
};

const getMyBalances = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const result = await db.query(`
            SELECT lb.*, lt.name as leave_type_name 
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.user_id = $1 AND lb.year = $2
        `, [req.user.id, year]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get all leave types
// @route   GET /api/leaves/types
// @access  Private
const getLeaveTypes = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM leave_types ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new leave type
// @route   POST /api/leaves/types
// @access  Private (Admin/HR)
const createLeaveType = async (req, res) => {
    let { name, is_paid, annual_limit } = req.body;
    console.log('createLeaveType Request:', req.body); // DEBUG LOG

    if (!name) return res.status(400).json({ message: 'Protocol Name is required' });

    // Parse partial data
    annual_limit = parseInt(annual_limit);
    if (isNaN(annual_limit)) annual_limit = 0;

    try {
        const result = await db.query(
            'INSERT INTO leave_types (name, is_paid, annual_limit) VALUES ($1, $2, $3) RETURNING *',
            [name, is_paid, annual_limit]
        );
        console.log('Created Leave Type:', result.rows[0]); // DEBUG LOG
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('createLeaveType Error:', error); // DEBUG LOG
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a leave type
// @route   DELETE /api/leaves/types/:id
// @access  Private (Admin/HR)
const deleteLeaveType = async (req, res) => {
    try {
        await db.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Leave type deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Sync all employee leave balances for the current year
// @route   POST /api/leaves/sync-balances
// @access  Private (Admin/HR)
const syncAllBalances = async (req, res) => {
    try {
        await db.query('BEGIN');
        const year = new Date().getFullYear();

        // 1. Get all active employees
        const empRes = await db.query('SELECT user_id FROM employees WHERE employment_status = \'Active\'');

        // 2. Get all leave types
        const typeRes = await db.query('SELECT id, annual_limit FROM leave_types');

        console.log(`[SYNC] Syncing ${empRes.rows.length} employees with ${typeRes.rows.length} leave types for year ${year}`);

        for (const emp of empRes.rows) {
            for (const type of typeRes.rows) {
                // Upsert logic: If doesn't exist, create with annual_limit. 
                // If exists, we don't overwrite used_days but update allocated_days if needed?
                // For now, let's just ensure they exist.

                const checkRes = await db.query(
                    'SELECT * FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
                    [emp.user_id, type.id, year]
                );

                if (checkRes.rows.length === 0) {
                    await db.query(
                        'INSERT INTO leave_balances (user_id, leave_type_id, year, allocated_days, used_days) VALUES ($1, $2, $3, $4, 0)',
                        [emp.user_id, type.id, year, type.annual_limit]
                    );
                } else {
                    // Update allocated_days in case the limit changed
                    await db.query(
                        'UPDATE leave_balances SET allocated_days = $1 WHERE id = $2',
                        [type.annual_limit, checkRes.rows[0].id]
                    );
                }
            }
        }

        await db.query('COMMIT');
        res.status(200).json({ message: 'Balances synchronized successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Sync Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    applyForLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getMyBalances,
    getLeaveTypes,
    createLeaveType,
    deleteLeaveType,
    syncAllBalances
};
