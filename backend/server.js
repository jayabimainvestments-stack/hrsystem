const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const rateLimit = require('express-rate-limit');

const app = express();

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    skip: (req, res) => process.env.NODE_ENV !== 'production'
});

// Middleware
app.use(express.json());
const path = require('path');

app.use(cors());
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(limiter); // Apply rate limiting to all requests

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/leaves', require('./routes/leave.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/policy', require('./routes/policy.routes'));
app.use('/api/deductions', require('./routes/deduction.routes'));
app.use('/api/recruitment', require('./routes/recruitment.routes'));
app.use('/api/onboarding', require('./routes/onboarding.routes'));
app.use('/api/meta', require('./routes/meta.routes'));
app.use('/api/payroll-settings', require('./routes/payroll.settings.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/resignations', require('./routes/resignation.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/security', require('./routes/security.routes'));
app.use('/api/performance', require('./routes/performance.routes'));
app.use('/api/legal', require('./routes/legal.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/governance', require('./routes/governance.routes'));
app.use('/api/salary', require('./routes/salary.routes'));
app.use('/api/biometric', require('./routes/biometric.routes'));
app.use('/api/financial', require('./routes/financial.routes'));
app.use('/api/loans', require('./routes/loan.routes'));
app.use('/api/manual-deductions', require('./routes/manual_deduction.routes'));
app.use('/api/organization', require('./routes/organization.routes'));
app.use('/api/welfare', require('./routes/welfare.routes'));

app.get('/', (req, res) => {
    res.send('HR Management System API is running');
});

app.get('/api/health-check', (req, res) => {
    res.json({
        pid: process.pid,
        cwd: process.cwd(),
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
