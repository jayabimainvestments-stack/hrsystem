const db = require('../config/db');

// @desc    Create/Submit a performance appraisal
// @route   POST /api/performance
// @access  Private (Managers/HR)
const createAppraisal = async (req, res) => {
    const { employee_id, appraisal_period, goals_achieved, skills_rating, behavior_rating, reviewer_comments, status } = req.body;
    try {
        const overall_score = (parseFloat(skills_rating) + parseFloat(behavior_rating)) / 2;
        const result = await db.query(
            `INSERT INTO performance_appraisals (employee_id, appraiser_id, appraisal_period, goals_achieved, skills_rating, behavior_rating, overall_score, reviewer_comments, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [employee_id, req.user.id, appraisal_period, goals_achieved, skills_rating, behavior_rating, overall_score, reviewer_comments, status || 'Submitted']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get appraisals for an employee
// @route   GET /api/performance/:employeeId
// @access  Private
const getEmployeeAppraisals = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM performance_appraisals WHERE employee_id = $1 ORDER BY created_at DESC',
            [req.params.employeeId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all appraisals (Admin/Management)
// @route   GET /api/performance
// @access  Private
const getAllAppraisals = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT pa.*, e.name as employee_name, u.name as appraiser_name
            FROM performance_appraisals pa
            JOIN employees e ON pa.employee_id = e.id
            JOIN users u ON pa.appraiser_id = u.id
            ORDER BY pa.created_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- NEW PERFORMANCE SCORING SYSTEM ---

// @desc    Get performance configuration (metrics and ranges)
// @route   GET /api/performance/config
const getPerformanceConfig = async (req, res) => {
    try {
        const metrics = await db.query('SELECT * FROM performance_metrics ORDER BY order_index ASC');
        const ranges = await db.query('SELECT * FROM performance_metric_ranges ORDER BY metric_id, mark');
        const settings = await db.query('SELECT * FROM performance_settings');

        const config = metrics.rows.map(m => ({
            ...m,
            ranges: ranges.rows.filter(r => r.metric_id === m.id)
        }));

        res.status(200).json({
            metrics: config,
            settings: settings.rows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit weekly performance data
// @route   POST /api/performance/weekly
const submitWeeklyData = async (req, res) => {
    const { employee_id, week_starting, week_ending, entries } = req.body; // entries: [{ metric_id, value }]

    if (!employee_id || !week_starting || !week_ending || !entries || !Array.isArray(entries)) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            for (const entry of entries) {
                // Upsert logic for weekly data based on composite unique constraint
                // Default status to 'Pending'
                await client.query(`
                    INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, week_ending, recorded_by, status)
                    VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
                    ON CONFLICT (employee_id, metric_id, week_starting) 
                    DO UPDATE SET value = EXCLUDED.value, week_ending = EXCLUDED.week_ending, recorded_by = EXCLUDED.recorded_by, updated_at = NOW()
                `, [employee_id, entry.metric_id, entry.value, week_starting, week_ending, req.user.id]);
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Weekly data recorded successfully' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get individualized performance configuration for an employee
// @route   GET /api/performance/config/:employeeId
const getEmployeePerformanceConfig = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const metrics = await db.query('SELECT * FROM performance_metrics ORDER BY order_index ASC');
        const employeeTargets = await db.query(
            'SELECT * FROM employee_performance_targets WHERE employee_id = $1 ORDER BY metric_id, mark',
            [employeeId]
        );
        const settings = await db.query('SELECT * FROM performance_settings');

        const config = metrics.rows.map(m => {
            const targets = employeeTargets.rows.filter(t => t.metric_id === m.id);
            return {
                ...m,
                assigned: targets.length > 0,
                targets: targets
            };
        });

        res.status(200).json({
            metrics: config,
            settings: settings.rows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save individualized performance targets for an employee
// @route   POST /api/performance/config/:employeeId
const saveEmployeePerformanceConfig = async (req, res) => {
    const { employeeId } = req.params;
    const { targets } = req.body; // targets: [{ metric_id, mark, min_value, max_value, is_descending }]

    if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ message: 'Invalid targets data' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Delete ALL existing targets for this employee to allow full replacement
            await client.query('DELETE FROM employee_performance_targets WHERE employee_id = $1', [employeeId]);

            // 2. Insert new targets
            for (const target of targets) {
                await client.query(`
                    INSERT INTO employee_performance_targets (employee_id, metric_id, mark, min_value, max_value, is_descending, target_name)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [employeeId, target.metric_id, target.mark, target.min_value, target.max_value, target.is_descending || false, target.target_name]);
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Employee targets updated successfully' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get performance summary for an employee for a month (Individualized)
// @route   GET /api/performance/summary/:employeeId/:month
const getPerformanceSummary = async (req, res) => {
    const { employeeId, month } = req.params;

    try {
        // 0. Get all metrics first to have titles
        const metricsRes = await db.query('SELECT * FROM performance_metrics');

        // 0. Check if month is approved
        const approvalRes = await db.query('SELECT status FROM performance_monthly_approvals WHERE employee_id = $1 AND month = $2', [employeeId, month]);
        const isApproved = approvalRes.rows.length > 0 && approvalRes.rows[0].status === 'Approved';

        // 1. Get weekly data that is either:
        //    a) Already processed for this month (historical)
        //    b) Still Pending (part of the current "accumulated" buffer) - ONLY IF NOT APPROVED
        let query = `
            SELECT wd.*, m.name as metric_name
            FROM performance_weekly_data wd
            JOIN performance_metrics m ON wd.metric_id = m.id
            WHERE wd.employee_id = $1 
              AND (wd.payroll_month = $2 ${!isApproved ? "OR wd.status = 'Pending'" : ""})
        `;
        const weeklyData = await db.query(query, [employeeId, month]);

        // 2. Get individual targets for this employee
        const targetsRes = await db.query(
            'SELECT * FROM employee_performance_targets WHERE employee_id = $1',
            [employeeId]
        );

        // 3. Get point value
        const pointValueRes = await db.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        // 4. Aggregate and Calculate scores by Metric
        const metricsMap = {};

        // Initialize metrics from config to ensure all assigned metrics show up
        const employeeMetrics = metricsRes.rows.filter(m => {
            return targetsRes.rows.some(t => Number(t.metric_id) === Number(m.id));
        });

        employeeMetrics.forEach(m => {
            const mTargets = targetsRes.rows.filter(t => Number(t.metric_id) === Number(m.id));
            metricsMap[m.id] = {
                metric_id: m.id,
                metric_title: m.name,
                score: 0,
                max_marks: Math.max(...mTargets.map(t => parseFloat(t.mark)), 0),
                payout: 0
            };
        });

        // Add up scores from weekly data
        weeklyData.rows.forEach(wd => {
            const metricTargets = targetsRes.rows.filter(t => Number(t.metric_id) === Number(wd.metric_id));
            let mark = 0;
            const val = parseFloat(wd.value);

            for (const t of metricTargets) {
                const min = parseFloat(t.min_value);
                const max = parseFloat(t.max_value);
                if (val >= min && val <= max) {
                    mark = parseFloat(t.mark);
                    break;
                }
            }

            if (metricsMap[wd.metric_id]) {
                metricsMap[wd.metric_id].score += mark;
                metricsMap[wd.metric_id].payout += mark * pointValue;
            }
        });

        const details = Object.values(metricsMap);
        const totalMarks = details.reduce((acc, curr) => acc + curr.score, 0);
        const totalAmount = totalMarks * pointValue;

        // 5. Group by week for breakdown
        const weeksMap = {};
        weeklyData.rows.forEach(wd => {
            // Using ISO string date part as key for stability
            const weekKey = new Date(wd.week_starting).toISOString().split('T')[0];
            if (!weeksMap[weekKey]) {
                weeksMap[weekKey] = {
                    week_starting: wd.week_starting,
                    week_ending: wd.week_ending,
                    status: wd.status,
                    total_marks: 0,
                    metrics: []
                };
            }

            // Re-calculate mark for this specific metric in this week
            const metricTargets = targetsRes.rows.filter(t => Number(t.metric_id) === Number(wd.metric_id));
            let mark = 0;
            const val = parseFloat(wd.value);
            for (const t of metricTargets) {
                if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                    mark = parseFloat(t.mark);
                    break;
                }
            }

            weeksMap[weekKey].total_marks += mark;
            weeksMap[weekKey].metrics.push({
                metric_id: wd.metric_id,
                metric_name: wd.metric_name,
                value: val,
                mark: mark
            });
        });

        res.status(200).json({
            details: details,
            weekly_breakdown: Object.values(weeksMap).sort((a, b) => new Date(b.week_starting) - new Date(a.week_starting)),
            total_marks: totalMarks,
            total_amount: totalAmount,
            point_value: pointValue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get aggregated monthly performance for all employees
// @route   GET /api/performance/approvals/:month
const getMonthlyApprovals = async (req, res) => {
    const { month } = req.params;

    try {
        // 1. Get all employees and their targets
        const employeesRes = await db.query(`
            SELECT e.id, 
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                   u.name, e.department
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);

        // 3. Get current approval status
        const approvalStatusRes = await db.query('SELECT * FROM performance_monthly_approvals WHERE month = $1', [month]);
        const statuses = approvalStatusRes.rows.reduce((acc, curr) => {
            acc[curr.employee_id] = curr;
            return acc;
        }, {});

        const isMonthClosed = approvalStatusRes.rows.some(r => r.status === 'Approved');

        // 2. Get all weekly data that is either:
        //    a) Already processed for this month
        //    b) Still Pending (ONLY if month is not closed)
        let weeklyQuery = `
            SELECT wd.employee_id, wd.metric_id, wd.value, wd.week_starting, wd.status
            FROM performance_weekly_data wd
            WHERE wd.payroll_month = $1
        `;
        if (!isMonthClosed) {
            weeklyQuery += ` OR wd.status = 'Pending' `;
        }
        const weeklyDataRes = await db.query(weeklyQuery, [month]);

        // 4. Get all targets
        const targetsRes = await db.query('SELECT * FROM employee_performance_targets');

        // 5. Get point value
        const pointValueRes = await db.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        // 6. Aggregate
        const report = employeesRes.rows.map(emp => {
            const empWeekly = weeklyDataRes.rows.filter(wd => wd.employee_id === emp.id);
            let totalMarks = 0;

            empWeekly.forEach(wd => {
                const metricTargets = targetsRes.rows.filter(t => t.employee_id === emp.id && t.metric_id === wd.metric_id);
                let mark = 0;
                const val = parseFloat(wd.value);
                for (const t of metricTargets) {
                    if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                        mark = parseFloat(t.mark);
                        break;
                    }
                }
                totalMarks += mark;
            });

            return {
                ...emp,
                total_marks: totalMarks,
                total_amount: totalMarks * pointValue,
                status: statuses[emp.id]?.status || 'Pending',
                approved_at: statuses[emp.id]?.approved_at,
                approved_by_name: statuses[emp.id]?.approved_by // Would need join for name, but ID is fine for now
            };
        });

        // 7. Calculate Global Summary
        const approvedCount = report.filter(r => r.status === 'Approved').length;
        const totalEmployees = report.length;
        const monthStatus = approvedCount === 0 ? 'Pending' : (approvedCount === totalEmployees ? 'Transferred' : 'Partially Transferred');

        res.status(200).json({
            month: month,
            status: monthStatus,
            approved_count: approvedCount,
            total_count: totalEmployees,
            data: report
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update monthly approval status
// @route   POST /api/performance/approvals
const updateMonthlyApproval = async (req, res) => {
    const { employee_id, month, total_marks, total_amount, status } = req.body;

    try {
        await db.query(`
            INSERT INTO performance_monthly_approvals (employee_id, month, total_marks, total_amount, status, approved_by, approved_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (employee_id, month)
            DO UPDATE SET 
                total_marks = EXCLUDED.total_marks,
                total_amount = EXCLUDED.total_amount,
                status = EXCLUDED.status,
                approved_by = EXCLUDED.approved_by,
                approved_at = NOW(),
                updated_at = NOW()
        `, [employee_id, month, total_marks, total_amount, status, req.user.id]);

        res.status(200).json({ message: `Monthly performance ${status.toLowerCase()} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk approve all employees' monthly performance and write to salary structure
// @route   POST /api/performance/approvals/bulk
const approveAllMonthlyPerformance = async (req, res) => {
    const { month } = req.body;

    if (!month) {
        return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all active employees
        const employeesRes = await client.query(`
            SELECT e.id, e.nic_passport as code, u.name, e.department
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);

        // 2. Get all weekly data that is either:
        //    a) Already processed for this month (re-calculating if needed)
        //    b) Still Pending (CONSOMING these)
        const weeklyDataRes = await client.query(`
            SELECT wd.id, wd.employee_id, wd.metric_id, wd.value, wd.week_starting, wd.status
            FROM performance_weekly_data wd
            WHERE wd.payroll_month = $1 OR wd.status = 'Pending'
        `, [month]);

        // 3. Get all targets
        const targetsRes = await client.query('SELECT * FROM employee_performance_targets');

        // 4. Get point value
        const pointValueRes = await client.query("SELECT value FROM performance_settings WHERE key = 'point_value'");
        const pointValue = parseFloat(pointValueRes.rows[0]?.value || 1000);

        // 5. Find the performance salary component (prioritize 'Monthly Performance')
        const perfComponentRes = await client.query(`
            SELECT id FROM salary_components 
            WHERE LOWER(name) LIKE '%performance%' AND status ILIKE 'active'
            ORDER BY CASE WHEN LOWER(name) LIKE '%monthly%' THEN 0 ELSE 1 END, name
            LIMIT 1
        `);

        if (perfComponentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'No active salary component with "performance" in its name found. Please create one first.' });
        }

        const perfComponentId = perfComponentRes.rows[0].id;

        // 6. Aggregate and approve each employee
        let approvedCount = 0;
        let totalApprovedAmount = 0;

        for (const emp of employeesRes.rows) {
            const empWeekly = weeklyDataRes.rows.filter(wd => wd.employee_id === emp.id);
            let totalMarks = 0;

            empWeekly.forEach(wd => {
                const metricTargets = targetsRes.rows.filter(t => t.employee_id === emp.id && t.metric_id === wd.metric_id);
                let mark = 0;
                const val = parseFloat(wd.value);
                for (const t of metricTargets) {
                    if (val >= parseFloat(t.min_value) && val <= parseFloat(t.max_value)) {
                        mark = parseFloat(t.mark);
                        break;
                    }
                }
                totalMarks += mark;
            });

            const totalAmount = totalMarks * pointValue;

            // Update performance_monthly_approvals
            await client.query(`
                INSERT INTO performance_monthly_approvals (employee_id, month, total_marks, total_amount, status, approved_by, approved_at)
                VALUES ($1, $2, $3, $4, 'Approved', $5, NOW())
                ON CONFLICT (employee_id, month)
                DO UPDATE SET 
                    total_marks = EXCLUDED.total_marks,
                    total_amount = EXCLUDED.total_amount,
                    status = 'Approved',
                    approved_by = EXCLUDED.approved_by,
                    approved_at = NOW(),
                    updated_at = NOW()
            `, [emp.id, month, totalMarks, totalAmount, req.user.id]);

            // Write approved amount to monthly_salary_overrides (NEW)
            // This ensures performance allowances are ONLY for the specific month
            // Sent as 'Draft' to require final HR Manager approval in Governance Hub
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, reason, status)
                VALUES ($1, $2, $3, $4, $5, 'Draft')
                ON CONFLICT (employee_id, month, component_id)
                DO UPDATE SET amount = EXCLUDED.amount, reason = EXCLUDED.reason, status = 'Draft'
            `, [emp.id, month, perfComponentId, totalAmount, 'Monthly Performance Marks']);

            // 7. MARK CONSUMED RECORDS AS PROCESSED
            const empPendingIds = empWeekly.filter(w => w.status === 'Pending').map(w => w.id);
            if (empPendingIds.length > 0) {
                await client.query(`
                    UPDATE performance_weekly_data 
                    SET status = 'Processed', payroll_month = $1, updated_at = NOW() 
                    WHERE id = ANY($2)
                `, [month, empPendingIds]);
            }

            approvedCount++;
            totalApprovedAmount += totalAmount;
        }


        await client.query('COMMIT');

        res.status(200).json({
            message: `Successfully approved ${approvedCount} employees. Total amount: LKR ${totalApprovedAmount.toLocaleString()}`,
            approved_count: approvedCount,
            total_amount: totalApprovedAmount
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

const getPerformanceMonthStatus = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const countRes = await db.query('SELECT COUNT(*) as total FROM employees WHERE employment_status = \'Active\'');
        const approvedRes = await db.query('SELECT COUNT(*) as approved FROM performance_monthly_approvals WHERE month = $1 AND status = \'Approved\'', [month]);

        const total = parseInt(countRes.rows[0].total);
        const approved = parseInt(approvedRes.rows[0].approved);

        res.status(200).json({
            exists: approved > 0,
            transferred: approved >= total && total > 0,
            status: approved >= total ? 'Approved' : (approved > 0 ? 'Partial' : 'Pending'),
            approved_count: approved,
            total_count: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new performance metric
// @route   POST /api/performance/metrics
const createMetric = async (req, res) => {
    const { name, description, order_index } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO performance_metrics (name, description, order_index) VALUES ($1, $2, $3) RETURNING *',
            [name, description, order_index || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a performance metric
// @route   PUT /api/performance/metrics/:id
const updateMetric = async (req, res) => {
    const { id } = req.params;
    const { name, description, order_index } = req.body;
    try {
        const result = await db.query(
            'UPDATE performance_metrics SET name = $1, description = $2, order_index = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, description, order_index || 0, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Metric not found' });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a performance metric
// @route   DELETE /api/performance/metrics/:id
const deleteMetric = async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check if metric is in use
        const weeklyData = await client.query('SELECT id FROM performance_weekly_data WHERE metric_id = $1 LIMIT 1', [id]);
        if (weeklyData.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot delete metric as it has recorded weekly data.' });
        }

        // Delete targets first
        await client.query('DELETE FROM employee_performance_targets WHERE metric_id = $1', [id]);

        // Delete metric
        const result = await client.query('DELETE FROM performance_metrics WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Metric not found' });
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Metric and associated targets deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

const getMyPerformanceSummary = async (req, res) => {
    const { month } = req.params;
    const userId = req.user.id;

    try {
        // 1. Get employee ID for this user
        const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        if (empRes.rows.length === 0) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }
        const employeeId = empRes.rows[0].id;

        // 2. Wrap the logic to call getPerformanceSummary with identified employeeId
        // Refactoring slightly to reuse existing logic:
        req.params.employeeId = employeeId;
        return getPerformanceSummary(req, res);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAppraisal,
    getEmployeeAppraisals,
    getAllAppraisals,
    getPerformanceConfig,
    getEmployeePerformanceConfig,
    saveEmployeePerformanceConfig,
    submitWeeklyData,
    getPerformanceSummary,
    getMonthlyApprovals,
    updateMonthlyApproval,
    approveAllMonthlyPerformance,
    getPerformanceMonthStatus,
    createMetric,
    updateMetric,
    deleteMetric,
    getMyPerformanceSummary
};
