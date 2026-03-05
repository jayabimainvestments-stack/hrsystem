const db = require('../config/db');

// @desc    Get current attendance policy
// @route   GET /api/attendance/policy
// @access  Private (VIEW_ATTENDANCE)
const getPolicy = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update attendance policy
// @route   PUT /api/attendance/policy
// @access  Private (MANAGE_ATTENDANCE)
const updatePolicy = async (req, res) => {
    const {
        work_start_time,
        work_end_time,
        short_leave_monthly_limit,
        half_day_yearly_limit,
        absent_deduction_rate,
        late_hourly_rate,
        absent_day_amount
    } = req.body;

    try {
        // Enforce update on the fixed configuration record (ID 1)
        // Using COALESCE for all fields to prevent overwriting with null/undefined if missing
        const parseVal = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            // Aggressively strip anything that isn't a digit or a decimal point
            const sanitized = String(val).replace(/[^0-9.]/g, '');
            return parseFloat(sanitized) || 0;
        };

        const result = await db.query(`
            INSERT INTO attendance_policies (
                id, work_start_time, work_end_time, short_leave_monthly_limit, 
                half_day_yearly_limit, absent_deduction_rate, late_hourly_rate, 
                absent_day_amount, fuel_rate_per_liter, updated_at
            ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                work_start_time = EXCLUDED.work_start_time,
                work_end_time = EXCLUDED.work_end_time,
                short_leave_monthly_limit = EXCLUDED.short_leave_monthly_limit,
                half_day_yearly_limit = EXCLUDED.half_day_yearly_limit,
                absent_deduction_rate = EXCLUDED.absent_deduction_rate,
                late_hourly_rate = EXCLUDED.late_hourly_rate,
                absent_day_amount = EXCLUDED.absent_day_amount,
                fuel_rate_per_liter = COALESCE(NULLIF(EXCLUDED.fuel_rate_per_liter, 0), attendance_policies.fuel_rate_per_liter),
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            work_start_time || '08:00:00',
            work_end_time || '17:00:00',
            parseVal(short_leave_monthly_limit),
            parseVal(half_day_yearly_limit),
            parseVal(absent_deduction_rate),
            parseVal(late_hourly_rate),
            parseVal(absent_day_amount),
            req.body.fuel_rate_per_liter !== undefined ? parseVal(req.body.fuel_rate_per_liter) : 0
        ]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPolicy,
    updatePolicy
};
