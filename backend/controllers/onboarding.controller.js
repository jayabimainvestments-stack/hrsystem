const db = require('../config/db');

// @desc    Assign tasks to an employee (Bulk or Single)
// @route   POST /api/onboarding/tasks
// @access  Private (Managers)
const assignTasks = async (req, res) => {
    const { employee_id, tasks, type } = req.body; // tasks = ["Email", "Slack"], type = 'Onboarding' | 'Offboarding'
    try {
        const promises = tasks.map(taskName => {
            return db.query(
                'INSERT INTO onboarding_tasks (employee_id, task_name, status, type) VALUES ($1, $2, $3, $4) RETURNING *',
                [employee_id, taskName, 'Pending', type || 'Onboarding']
            );
        });

        const results = await Promise.all(promises);
        res.status(201).json(results.map(r => r.rows[0]));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get tasks for an employee
// @route   GET /api/onboarding/tasks/:employeeId
// @access  Private (Employee/Manager)
const getTasks = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM onboarding_tasks WHERE employee_id = $1 ORDER BY created_at ASC`,
            [req.params.employeeId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update task status (Complete/Pending)
// @route   PUT /api/onboarding/tasks/:id
// @access  Private (Manager/Admin)
const updateTaskStatus = async (req, res) => {
    const { status } = req.body; // 'Completed' or 'Pending'
    try {
        let completedAt = null;
        let completedBy = null;

        if (status === 'Completed') {
            completedAt = new Date();
            completedBy = req.user.id;
        }

        const result = await db.query(
            `UPDATE onboarding_tasks 
             SET status = $1, completed_at = $2, completed_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 RETURNING *`,
            [status, completedAt, completedBy, req.params.id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    assignTasks,
    getTasks,
    updateTaskStatus
};
