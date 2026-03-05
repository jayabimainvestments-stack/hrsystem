const express = require('express');
const router = express.Router();
const {
    createDisciplinaryRecord,
    getEmployeeDisciplinaryRecords,
    getAllDisciplinaryRecords,
    addTrainingCertification,
    getEmployeeTrainingRecords,
    getAllTrainingRecords
} = require('../controllers/legal.controller');
const { protect } = require('../middleware/auth.middleware');
const auditLog = require('../middleware/audit.middleware');

// Disciplinary
router.post('/disciplinary', protect, auditLog('CREATE_DISCIPLINARY_RECORD'), createDisciplinaryRecord);
router.get('/disciplinary', protect, getAllDisciplinaryRecords);
router.get('/disciplinary/:employeeId', protect, getEmployeeDisciplinaryRecords);

// Training
router.post('/training', protect, auditLog('ADD_TRAINING_CERTIFICATION'), addTrainingCertification);
router.get('/training', protect, getAllTrainingRecords);
router.get('/training/:employeeId', protect, getEmployeeTrainingRecords);

module.exports = router;
