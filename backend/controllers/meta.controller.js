const db = require('../config/db');

// --- DEPARTMENTS ---

// @desc    Get all departments
// @route   GET /api/meta/departments
// @access  Private
const getDepartments = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM departments ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create department
// @route   POST /api/meta/departments
// @access  Private (Admin/HR)
const createDepartment = async (req, res) => {
    const { name, code, head_of_department } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO departments (name, code, head_of_department) VALUES ($1, $2, $3) RETURNING *',
            [name, code, head_of_department]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'Department already exists' });
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update department
// @route   PUT /api/meta/departments/:id
// @access  Private (Admin/HR)
const updateDepartment = async (req, res) => {
    const { name, code, status, head_of_department } = req.body;
    try {
        const result = await db.query(
            `UPDATE departments 
             SET name = COALESCE($1, name), code = COALESCE($2, code), 
                 status = COALESCE($3, status), head_of_department = COALESCE($4, head_of_department)
             WHERE id = $5 RETURNING *`,
            [name, code, status, head_of_department, req.params.id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete department
// @route   DELETE /api/meta/departments/:id
// @access  Private (Admin/HR)
const deleteDepartment = async (req, res) => {
    try {
        await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Department deleted' });
    } catch (error) {
        if (error.code === '23503') return res.status(400).json({ message: 'Cannot delete department: It has assigned employees or designations.' });
        res.status(500).json({ message: error.message });
    }
};

// --- DESIGNATIONS ---

// @desc    Get all designations
// @route   GET /api/meta/designations
// @access  Private
const getDesignations = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT d.*, dept.name as department_name 
            FROM designations d
            LEFT JOIN departments dept ON d.department_id = dept.id
            ORDER BY d.title
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create designation
// @route   POST /api/meta/designations
// @access  Private (Admin/HR)
const createDesignation = async (req, res) => {
    const { title, department_id, min_salary, max_salary } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO designations (title, department_id, min_salary, max_salary) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, department_id, min_salary, max_salary]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'Designation already exists' });
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update designation
// @route   PUT /api/meta/designations/:id
// @access  Private (Admin/HR)
const updateDesignation = async (req, res) => {
    const { title, department_id, status, min_salary, max_salary } = req.body;
    try {
        const result = await db.query(
            `UPDATE designations 
             SET title = COALESCE($1, title), department_id = COALESCE($2, department_id), 
                 status = COALESCE($3, status), 
                 min_salary = COALESCE($4, min_salary), max_salary = COALESCE($5, max_salary)
             WHERE id = $6 RETURNING *`,
            [title, department_id, status, min_salary, max_salary, req.params.id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete designation
// @route   DELETE /api/meta/designations/:id
// @access  Private (Admin/HR)
const deleteDesignation = async (req, res) => {
    try {
        await db.query('DELETE FROM designations WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Designation deleted' });
    } catch (error) {
        if (error.code === '23503') return res.status(400).json({ message: 'Cannot delete designation: It is assigned to employees.' });
        res.status(500).json({ message: error.message });
    }
};

// --- LEAVE TYPES ---

// @desc    Get all leave types
// @route   GET /api/meta/leave-types
// @access  Private
const getLeaveTypes = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM leave_types ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create leave type
// @route   POST /api/meta/leave-types
// @access  Private (Admin/HR)
const createLeaveType = async (req, res) => {
    const { name, is_paid, annual_limit } = req.body;
    try {
        // 1. Explicit duplicate check (case-insensitive and trimmed)
        const checkRes = await db.query(
            'SELECT id FROM leave_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
            [name]
        );

        if (checkRes.rows.length > 0) {
            return res.status(400).json({ message: `A leave type with the name "${name}" already exists.` });
        }

        const result = await db.query(
            'INSERT INTO leave_types (name, is_paid, annual_limit) VALUES ($1, $2, $3) RETURNING *',
            [name, is_paid === undefined ? true : is_paid, parseInt(annual_limit) || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'Leave type already exists' });
        res.status(500).json({
            message: error.message,
            code: error.code,
            detail: error.detail
        });
    }
};

// @desc    Update leave type
// @route   PUT /api/meta/leave-types/:id
// @access  Private (Admin/HR)
const updateLeaveType = async (req, res) => {
    const { name, is_paid, annual_limit } = req.body;
    try {
        const result = await db.query(
            `UPDATE leave_types 
             SET name = COALESCE($1, name), 
                 is_paid = CASE WHEN $2 IS NULL THEN is_paid ELSE $2 END,
                 annual_limit = COALESCE($3, annual_limit)
             WHERE id = $4 RETURNING *`,
            [name, is_paid, annual_limit !== undefined ? parseInt(annual_limit) : null, req.params.id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete leave type
// @route   DELETE /api/meta/leave-types/:id
// @access  Private (Admin/HR)
const deleteLeaveType = async (req, res) => {
    try {
        await db.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Leave type deleted' });
    } catch (error) {
        if (error.code === '23503') return res.status(400).json({ message: 'Cannot delete leave type: It has assigned balances or records.' });
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType
};
