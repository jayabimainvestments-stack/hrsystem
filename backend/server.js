const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const cron = require('node-cron');
const { runAutomatedDailyInit } = require('./controllers/biometric.controller');
let scrapeFuelPrice;
try {
    const scraperService = require('./services/fuelScraper.service.js');
    scrapeFuelPrice = scraperService.scrapeFuelPrice;
} catch (error) {
    console.error('[STARTUP] Failed to load fuel scraper service:', error.message);
    scrapeFuelPrice = null;
}

const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy for Hugging Face/Vercel platform proxy
app.set('trust proxy', 1);

// CORS Configuration - allow Vercel frontend and local dev
const allowedOrigins = [
    /\.vercel\.app$/,      // All Vercel deployments
    /\.hf\.space$/,        // Hugging Face Spaces
    /^http:\/\/localhost/,  // Local development
    /^http:\/\/192\.168\./  // LAN access
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Render health checks)
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.some(pattern => pattern.test(origin));
        if (allowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow all for now; tighten after first deploy
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    skip: (req, res) => process.env.NODE_ENV !== 'production'
});

// Middleware
app.use(express.json());
// ZKTeco ADMS devices send attendance data as plain text
app.use(express.text({ type: 'text/plain', limit: '5mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '5mb' }));
const path = require('path');

app.use(cors(corsOptions));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(limiter); // Apply rate limiting to all requests

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
// ZKTeco ADMS device push (no /api prefix - device expects /iclock path directly)
app.use('/iclock', require('./routes/iclock.routes'));

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
app.use('/api/holidays', require('./routes/holiday.routes'));

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

// Schedule automated daily initialization at 1:00 AM Sri Lanka Time
cron.schedule('0 1 * * *', async () => {
    console.log('[CRON] Starting automated daily initialization...');
    try {
        await runAutomatedDailyInit();
    } catch (error) {
        console.error('[CRON] Automated daily init failed:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});

// Schedule automated fuel price check at 2:00 AM Sri Lanka Time
cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Starting automated fuel price check...');
    try {
        if (scrapeFuelPrice) await scrapeFuelPrice();
    } catch (error) {
        console.error('[CRON] Fuel scraper failed:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    
    // Run scraper once on startup, AFTER server is listening
    if (scrapeFuelPrice) {
        scrapeFuelPrice().catch(err => console.error('[STARTUP] Initial fuel scrape failed:', err));
    } else {
        console.warn('[STARTUP] Fuel scraper skipped: Service not loaded.');
    }
});
