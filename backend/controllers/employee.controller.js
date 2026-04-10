const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Admin/HR)
const getEmployees = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT e.*, u.name, u.email, u.role, u.profile_picture,
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code
            FROM employees e 
            JOIN users u ON e.user_id = u.id
        `;
        let params = [];

        if (status) {
            query += ` WHERE e.employment_status = $1`;
            params.push(status);
        }

        query += ` ORDER BY u.name`;

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res) => {
    try {
        // Explicitly select columns to avoid collision between u.id and e.id/e.user_id
        const result = await db.query(`
            SELECT 
                u.id as user_id, u.name, u.email, u.role, u.profile_picture,
                e.id as employee_id, e.designation, e.department, e.hire_date, e.employment_status,
                e.phone, e.address, e.nic_passport, e.dob, e.gender, e.marital_status, e.blood_group,
                e.emergency_contact, e.is_epf_eligible, e.is_etf_eligible, e.biometric_id,
                b.bank_name, b.branch_code, b.account_number, b.account_holder_name
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id 
            LEFT JOIN employee_bank_details b ON u.id = b.user_id
            WHERE e.id::text = $1 OR u.id::text = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const row = result.rows[0];
        // Structure the response
        const employee = {
            ...row,
            id: row.employee_id || null, // Keep 'id' for frontend compatibility
            bank_details: row.bank_name ? {
                bank_name: row.bank_name,
                branch_code: row.branch_code,
                account_number: row.account_number,
                account_holder_name: row.account_holder_name
            } : null
        };

        res.status(200).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new employee profile
// @route   POST /api/employees
// @access  Private (Admin/HR)
const createEmployee = async (req, res) => {
    const {
        name, email, password, role,
        designation, department, hire_date, phone, address,
        nic_passport, dob, gender, marital_status, blood_group, emergency_contact,
        is_epf_eligible, is_etf_eligible, biometric_id,
        bank_details // { bank_name, branch_code, account_number, account_holder_name }
    } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Create User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, role || 'Employee']
        );
        const userId = userResult.rows[0].id;

        // 2. Create Employee Profile
        const empContact = emergency_contact ? JSON.stringify(emergency_contact) : null;
        await db.query(
            `INSERT INTO employees 
            (user_id, designation, department, hire_date, phone, address, nic_passport, dob, gender, marital_status, blood_group, emergency_contact, is_epf_eligible, is_etf_eligible, biometric_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [userId, designation, department, hire_date, phone, address, nic_passport, dob, gender, marital_status, blood_group, empContact,
                is_epf_eligible === undefined ? true : is_epf_eligible,
                is_etf_eligible === undefined ? true : is_etf_eligible,
                biometric_id]
        );

        // 3. Bank Details
        if (bank_details) {
            await db.query(
                `INSERT INTO employee_bank_details 
                (user_id, bank_name, branch_code, account_number, account_holder_name)
                VALUES ($1, $2, $3, $4, $5)`,
                [userId, bank_details.bank_name, bank_details.branch_code, bank_details.account_number, bank_details.account_holder_name]
            );
        }

        await db.query('COMMIT');
        res.status(201).json({
            message: 'Employee created successfully',
            userId: userId
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

const isFieldValueChanged = (currentVal, newVal) => {
    // Treat null, undefined, and empty string as equivalent
    const normalizedCurrent = (currentVal === null || currentVal === undefined) ? '' : String(currentVal).trim();
    const normalizedNew = (newVal === null || newVal === undefined) ? '' : String(newVal).trim();

    // Handle Date objects from Postgres
    if (currentVal instanceof Date && !isNaN(currentVal)) {
        const dateCurrent = currentVal.toISOString().split('T')[0];
        // If newVal is already a valid date string, compare just the date part
        return dateCurrent !== normalizedNew;
    }

    // Handle potential date strings from DB (YYYY-MM-DD...)
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (typeof currentVal === 'string' && dateRegex.test(currentVal) && dateRegex.test(normalizedNew)) {
        return currentVal.split('T')[0] !== normalizedNew.split('T')[0];
    }

    return normalizedCurrent !== normalizedNew;
};

const updateEmployee = async (req, res) => {
    const {
        name, email, role,
        nic_passport, designation, department, hire_date, employment_status, phone, address,
        dob, gender, marital_status, blood_group, emergency_contact,
        is_epf_eligible, is_etf_eligible, biometric_id,
        bank_details
    } = req.body;

    const id = req.params.id;

    try {
        await db.query('BEGIN');

        // 1. Get current state
        const currentRes = await db.query(`
            SELECT e.*, u.id as user_id, u.name, u.email,
                   b.bank_name, b.branch_code, b.account_number, b.account_holder_name
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN employee_bank_details b ON u.id = b.user_id
            WHERE e.id = $1
        `, [id]);

        if (currentRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Employee not found' });
        }
        const current = currentRes.rows[0];
        const userId = current.user_id;

        // 2. Identify Pending Changes (Sensitive fields)
        let pendingCount = 0;
        const requestReason = req.body.reason || 'Routine update';

        // Split fields by entity for correct governance tracking
        const userSensitiveFields = ['name', 'email'];
        const employeeSensitiveFields = [
            'nic_passport', 'designation', 'department', 'employment_status',
            'biometric_id', 'epf_no', 'phone', 'address', 'dob', 'gender',
            'marital_status', 'hire_date', 'is_epf_eligible', 'is_etf_eligible'
        ];

        const pendingFields = new Set();

        for (const field of userSensitiveFields) {
            if (req.body[field] !== undefined && isFieldValueChanged(current[field], req.body[field])) {
                await db.query(
                    `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    ['users', userId, field, current[field], req.body[field], req.user.id, requestReason]
                );
                pendingCount++;
                pendingFields.add(field);
            }
        }

        for (const field of employeeSensitiveFields) {
            if (req.body[field] !== undefined && isFieldValueChanged(current[field], req.body[field])) {
                await db.query(
                    `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    ['employees', id, field, current[field], req.body[field], req.user.id, requestReason]
                );
                pendingCount++;
                pendingFields.add(field);
            }
        }

        // Bank details sensitive changes
        if (bank_details) {
            const bankFieldsMapping = {
                bank_name: 'bank_name',
                branch_code: 'branch_code',
                account_number: 'account_number',
                account_holder_name: 'account_holder_name'
            };
            for (const [bodyField, dbField] of Object.entries(bankFieldsMapping)) {
                if (bank_details[bodyField] !== undefined && isFieldValueChanged(current[dbField], bank_details[bodyField])) {
                    await db.query(
                        `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        ['employee_bank_details', userId, dbField, current[dbField], bank_details[bodyField], req.user.id, requestReason]
                    );
                    pendingCount++;
                }
            }
        }

        // 3. Update ONLY Password directly (if Admin)
        if (req.body.password && req.user.role === 'Admin') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        }

        // Handle role update (Admin only)
        if (role && req.user.role === 'Admin') {
            await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        }

        const empContact = emergency_contact ? JSON.stringify(emergency_contact) : null;

        // CRITICAL FIX: If a field is pending approval, we DO NOT update it in the immediate table.
        // We use the CURRENT value instead of the NEW value for those specific fields.
        const finalHireDate = pendingFields.has('hire_date') ? current.hire_date : (hire_date || current.hire_date);
        const finalEpfEligible = pendingFields.has('is_epf_eligible') ? current.is_epf_eligible : (is_epf_eligible === undefined ? current.is_epf_eligible : is_epf_eligible);
        const finalEtfEligible = pendingFields.has('is_etf_eligible') ? current.is_etf_eligible : (is_etf_eligible === undefined ? current.is_etf_eligible : is_etf_eligible);

        const result = await db.query(
            `UPDATE employees 
             SET hire_date = $1, 
                 is_epf_eligible = $2,
                 is_etf_eligible = $3,
                 emergency_contact = COALESCE($4, emergency_contact)
             WHERE id = $5 RETURNING *`,
            [finalHireDate, finalEpfEligible, finalEtfEligible, empContact, id]
        );

        await db.query('COMMIT');
        res.status(200).json({
            message: pendingCount > 0 ? `Update processed. ${pendingCount} sensitive changes pending approval.` : 'Employee updated successfully.',
            employee: result.rows[0],
            pending_changes: pendingCount
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Promote/Transfer Employee
// @route   PUT /api/employees/:id/promote
// @access  Private (Admin/HR)
const promoteEmployee = async (req, res) => {
    const {
        new_designation, new_department, new_salary,
        action_type, reason
    } = req.body;

    try {
        await db.query('BEGIN');
        const currentEmpRes = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
        if (currentEmpRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Employee not found' });
        }
        const currentEmp = currentEmpRes.rows[0];
        const requestReason = reason || 'Career Update / Promotion';

        let pendingCount = 0;

        // Handle Governance for Designation change
        if (new_designation && isFieldValueChanged(currentEmp.designation, new_designation)) {
            await db.query(
                `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['employees', req.params.id, 'designation', currentEmp.designation, new_designation, req.user.id, requestReason]
            );
            pendingCount++;
        }

        // Handle Governance for Department change
        if (new_department && isFieldValueChanged(currentEmp.department, new_department)) {
            await db.query(
                `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['employees', req.params.id, 'department', currentEmp.department, new_department, req.user.id, requestReason]
            );
            pendingCount++;
        }

        // Handle Salary update directly or via governance?
        // Salary should also be approved if it's changing the baseline.
        if (new_salary && (parseFloat(new_salary) > 0)) {
            const componentRes = await db.query('SELECT id FROM salary_components WHERE name ILIKE $1 OR name ILIKE $2', ['Basic pay', 'Basic Salary']);
            if (componentRes.rows.length > 0) {
                const basicSalaryId = componentRes.rows[0].id;
                const check = await db.query(
                    'SELECT amount FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [req.params.id, basicSalaryId]
                );
                
                const currentSalary = check.rows.length > 0 ? check.rows[0].amount : 0;
                
                if (isFieldValueChanged(currentSalary, new_salary)) {
                    await db.query(
                        `INSERT INTO pending_changes (entity, entity_id, field_name, old_value, new_value, requested_by, reason)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        ['employee_salary_structure', req.params.id, `salary_structure:${basicSalaryId}`, currentSalary, new_salary, req.user.id, requestReason]
                    );
                    pendingCount++;
                }
            }
        }

        // Create history record (This can happen immediately as it's an audit trail of the REQUEST)
        await db.query(
            `INSERT INTO employee_history 
            (employee_id, action_type, previous_department, new_department, previous_designation, new_designation, previous_salary, new_salary, reason, changed_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                req.params.id, action_type || 'Update',
                currentEmp.department, new_department || currentEmp.department,
                currentEmp.designation, new_designation || currentEmp.designation,
                0, new_salary || 0,
                reason, req.user.id
            ]
        );

        // NOTE: We DO NOT update the employees table designation/department here if they are now pending approval.
        // If pendingCount > 0, the actual changes await Governance.

        await db.query('COMMIT');
        res.status(200).json({
            message: pendingCount > 0 ? `${pendingCount} changes queued for approval.` : 'Career record updated.',
            pending_changes: pendingCount
        });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get current user's employee profile
// @route   GET /api/employees/me
// @access  Private
const getMyProfile = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                e.*, 
                u.name, u.email, u.role, u.profile_picture,
                b.bank_name, b.branch_code, b.account_number, b.account_holder_name
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id 
            LEFT JOIN employee_bank_details b ON u.id = b.user_id
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const row = result.rows[0];
        // If employee record (e.id) is missing, we create a stub response
        const employee = {
            ...row,
            id: row.id || null, // employee.id is null if record missing
            bank_details: row.bank_name ? {
                bank_name: row.bank_name,
                branch_code: row.branch_code,
                account_number: row.account_number,
                account_holder_name: row.account_holder_name
            } : null
        };

        res.status(200).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Salary Structure
// @route   GET /api/employees/:id/salary-structure
// @access  Private (Admin/HR)
const getSalaryStructure = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.component_id, c.name, s.amount, c.type 
             FROM employee_salary_structure s
             JOIN salary_components c ON s.component_id = c.id
             WHERE s.employee_id = $1`,
            [req.params.id]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    promoteEmployee,
    getMyProfile,
    getSalaryStructure
};