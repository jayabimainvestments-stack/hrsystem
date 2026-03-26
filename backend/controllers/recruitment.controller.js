const db = require('../config/db');
const path = require('path');
const { generateRandomPassword, sendEmail } = require('../utils/email.utils');
const bcrypt = require('bcryptjs');

// @desc    Create a new job posting
// @route   POST /api/recruitment/jobs
// @access  Private (HR/Admin)
const createJob = async (req, res) => {
    const { title, department, location, type, description, requirements, closing_date } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO jobs (title, department, location, type, description, requirements, closing_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, department, location, type, description, requirements, closing_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all job postings
// @route   GET /api/recruitment/jobs
// @access  Public
const getJobs = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM jobs WHERE status = $1 ORDER BY created_at DESC', ['Open']);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a job application
// @route   POST /api/recruitment/apply
// @access  Public
const submitApplication = async (req, res) => {
    const { job_id, name, email, phone, linkedin_url, additional_info } = req.body;
    const resume_path = req.file ? req.file.path : null;

    try {
        await db.query('BEGIN');

        // 1. Create or update candidate
        let candidateRes = await db.query('SELECT id FROM candidates WHERE email = $1', [email]);
        let candidateId;

        if (candidateRes.rows.length === 0) {
            const newCandidate = await db.query(
                `INSERT INTO candidates (name, email, phone, linkedin_url)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [name, email, phone, linkedin_url]
            );
            candidateId = newCandidate.rows[0].id;
        } else {
            candidateId = candidateRes.rows[0].id;
            await db.query(
                `UPDATE candidates SET name = $1, phone = $2, linkedin_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
                [name, phone, linkedin_url, candidateId]
            );
        }

        // 2. Create application
        const applicationRes = await db.query(
            `INSERT INTO job_applications (job_id, candidate_id, resume_url, additional_info)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [job_id, candidateId, resume_path, additional_info]
        );

        await db.query('COMMIT');
        res.status(201).json(applicationRes.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get applications for a specific job
// @route   GET /api/recruitment/applications/:jobId
// @access  Private (HR/Admin)
const getJobApplications = async (req, res) => {
    const jobId = req.params.jobId;
    try {
        const result = await db.query(`
            SELECT ja.*, c.name, c.email, c.phone, c.linkedin_url
            FROM job_applications ja
            JOIN candidates c ON ja.candidate_id = c.id
            WHERE ja.job_id = $1
            ORDER BY ja.created_at DESC
        `, [jobId]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update application status (Automated Hiring Workflow)
// @route   PUT /api/recruitment/applications/:id/status
// @access  Private (HR)
const updateApplicationStatus = async (req, res) => {
    const { status, notes, designation, department, nic_passport, hire_date } = req.body;
    const applicationId = req.params.id;

    try {
        await db.query('BEGIN');

        // 1. Get Application & Candidate Info
        const appRes = await db.query(`
            SELECT ja.*, c.name, c.email, c.phone 
            FROM job_applications ja
            JOIN candidates c ON ja.candidate_id = c.id
            WHERE ja.id = $1
        `, [applicationId]);

        if (appRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Application not found' });
        }

        const application = appRes.rows[0];

        // 2. If Transitioning to 'Hired', perform automated staff creation
        if (status === 'Hired' && application.status !== 'Hired') {
            if (!designation || !department || !nic_passport) {
                await db.query('ROLLBACK');
                return res.status(400).json({ message: 'Designation, Department, and NIC/Passport are required to hire a candidate' });
            }

            // a. Create System User with Activation Token
            const crypto = require('crypto');
            const activationToken = crypto.randomBytes(32).toString('hex');
            const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Initial random long password (will be changed via activation)
            const initialPassword = crypto.randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(initialPassword, salt);

            const userRes = await db.query(
                `INSERT INTO users (name, email, password, role, activation_token, activation_expires_at, force_password_change) 
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
                [application.name, application.email, hashedPassword, 'Employee', activationToken, activationExpires]
            );
            const newUserId = userRes.rows[0].id;

            // b. Create Employee Profile
            await db.query(
                `INSERT INTO employees (user_id, designation, department, hire_date, phone, address, nic_passport, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')`,
                [newUserId, designation, department, hire_date || new Date().toISOString().split('T')[0], application.phone, 'Pending Update', nic_passport]
            );

            // c. Initialize Empty Salary Structure
            await db.query(
                `INSERT INTO salary_structures (employee_id, basic_salary) 
                 VALUES ((SELECT id FROM employees WHERE user_id = $1), 0)`,
                [newUserId]
            );

            // d. Send back activation info
            res.locals.activation = {
                email: application.email,
                activation_token: activationToken,
                activation_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate?token=${activationToken}`
            };
        }

        // 3. Update Application Status
        const result = await db.query(
            `UPDATE job_applications 
             SET status = COALESCE($1, status), notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [status, notes, applicationId]
        );

        await db.query('COMMIT');

        const response = { ...result.rows[0] };
        if (res.locals.activation) {
            response.activation = res.locals.activation;
        }

        res.status(200).json(response);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createJob,
    getJobs,
    submitApplication,
    getJobApplications,
    updateApplicationStatus
};
