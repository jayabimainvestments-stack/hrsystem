const express = require('express');
const router = express.Router();
const {
    createJob, getJobs, submitApplication,
    getJobApplications, updateApplicationStatus
} = require('../controllers/recruitment.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const upload = require('../middleware/upload.middleware');
const auditLog = require('../middleware/audit.middleware');

// Job Routes
router.post('/jobs', protect, checkPermission('MANAGE_EMPLOYEES'), auditLog('CREATE_JOB', 'jobs'), createJob); // Re-using MANAGE_EMPLOYEES or create new MANAGE_RECRUITMENT? Using existing for now.
router.get('/jobs', getJobs); // Publicly accessible for now (Authentication optional)

// Application Routes
// Apply (Public-ish, but if we want to secure it, we can. For now, let's keep it open or require strict auth if internal only).
// Making it open for "candidate" portal simulation, but maybe just protect for now if HR is entering data. 
// Let's assume HR enters it manually or it's an internal portal.
router.post('/apply', upload.single('resume'), auditLog('SUBMIT_APPLICATION', 'job_applications'), submitApplication);

router.get('/applications/:jobId', protect, checkPermission('MANAGE_EMPLOYEES'), getJobApplications);
router.put('/applications/:id/status', protect, checkPermission('MANAGE_EMPLOYEES'), auditLog('UPDATE_APPLICATION_STATUS', 'job_applications'), updateApplicationStatus);

module.exports = router;
