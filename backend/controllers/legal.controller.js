const db = require('../config/db');

// --- DISCIPLINARY ---
const createDisciplinaryRecord = async (req, res) => {
    const { employee_id, description, action_taken, incident_date, status } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO disciplinary_records (employee_id, description, action_taken, incident_date, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [employee_id, description, action_taken, incident_date, status || 'Open', req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEmployeeDisciplinaryRecords = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM disciplinary_records WHERE employee_id = $1 ORDER BY incident_date DESC',
            [req.params.employeeId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- TRAINING ---
const addTrainingCertification = async (req, res) => {
    const { employee_id, training_name, provider, completion_date, expiry_date, type } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO training_certifications (employee_id, training_name, provider, completion_date, expiry_date, type)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [employee_id, training_name, provider, completion_date, expiry_date, type || 'External']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEmployeeTrainingRecords = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM training_certifications WHERE employee_id = $1 ORDER BY completion_date DESC',
            [req.params.employeeId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllDisciplinaryRecords = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT dr.*, e.name as employee_name, u.name as created_by_name
            FROM disciplinary_records dr
            JOIN employees e ON dr.employee_id = e.id
            JOIN users u ON dr.created_by = u.id
            ORDER BY dr.incident_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllTrainingRecords = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT tc.*, e.name as employee_name
            FROM training_certifications tc
            JOIN employees e ON tc.employee_id = e.id
            ORDER BY tc.completion_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDisciplinaryRecord,
    getEmployeeDisciplinaryRecords,
    getAllDisciplinaryRecords,
    addTrainingCertification,
    getEmployeeTrainingRecords,
    getAllTrainingRecords
};
