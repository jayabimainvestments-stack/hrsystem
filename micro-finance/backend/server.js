const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5001; // Using 5001 to avoid clash with HR system on 5000

// Middleware
app.use(cors());
app.use(express.json());

// Set up Multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// Database Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Test Connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('[DATABASE] Connection error:', err.message);
    } else {
        console.log('[DATABASE] Connected successfully.');
    }
});

// --- API ROUTES ---

// 1. Centers (Groups)
app.get('/api/centers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM mf_customers WHERE center_id = c.id) as cluster_size
            FROM mf_centers c 
            ORDER BY c.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/centers', async (req, res) => {
    const { 
        name, collector_name, manager_name, collection_day, meeting_time, 
        meeting_place, village, gnd, ds_division, max_capacity, 
        latitude, longitude 
    } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO mf_centers 
            (name, collector_name, manager_name, collection_day, meeting_time, 
             meeting_place, village, gnd, ds_division, max_capacity, 
             latitude, longitude) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING *`,
            [name, collector_name, manager_name, collection_day, meeting_time, 
             meeting_place, village, gnd, ds_division, max_capacity, 
             latitude, longitude]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Customers (Clients)
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, ctr.name as center_name 
            FROM mf_customers c 
            LEFT JOIN mf_centers ctr ON c.center_id = ctr.id 
            ORDER BY c.full_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    const { 
        nic, full_name, phone, phone_home, address_permanent, postal_address, 
        center_id, gender, civil_status, occupation, spouse_name, spouse_nic, 
        monthly_income, guarantor_1_name, guarantor_1_nic, guarantor_1_phone,
        guarantor_2_name, guarantor_2_nic, guarantor_2_phone,
        guardian_name, guardian_nic 
    } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO mf_customers 
            (nic, full_name, phone, phone_home, address_permanent, postal_address, center_id, 
             gender, civil_status, occupation, spouse_name, spouse_nic, monthly_income,
             guarantor_1_name, guarantor_1_nic, guarantor_1_phone,
             guarantor_2_name, guarantor_2_nic, guarantor_2_phone,
             guardian_name, guardian_nic) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
            RETURNING *`,
            [nic, full_name, phone, phone_home, address_permanent, postal_address, center_id, 
             gender, civil_status, occupation, spouse_name, spouse_nic, monthly_income,
             guarantor_1_name, guarantor_1_nic, guarantor_1_phone,
             guarantor_2_name, guarantor_2_nic, guarantor_2_phone,
             guardian_name, guardian_nic]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Loan Products
app.get('/api/loan-products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mf_loan_products ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/loan-products', async (req, res) => {
    const { name, interest_rate, default_installments, frequency } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO mf_loan_products (name, interest_rate, default_installments, frequency) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, interest_rate, default_installments, frequency || 'Weekly']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Loans & Installments (The "Engine")
app.get('/api/loans', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, c.full_name as customer_name, cp.name as product_name
            FROM mf_loans l
            JOIN mf_customers c ON l.customer_id = c.id
            JOIN mf_loan_products cp ON l.product_id = cp.id
            ORDER BY l.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/loans', async (req, res) => {
    const { customer_id, product_id, principal_amount } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch product details
        const productRes = await client.query('SELECT * FROM mf_loan_products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) throw new Error('Product not found');
        const product = productRes.rows[0];

        // Calculation (Flat Rate for now)
        const interest_amount = (principal_amount * product.interest_rate) / 100;
        const total_payable = parseFloat(principal_amount) + parseFloat(interest_amount);
        const installment_amount = Math.ceil(total_payable / product.default_installments);

        // Insert Loan
        const loanResult = await client.query(
            `INSERT INTO mf_loans (customer_id, product_id, principal_amount, interest_amount, total_payable, installment_amount, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *`,
            [customer_id, product_id, principal_amount, interest_amount, total_payable, installment_amount]
        );
        const loan = loanResult.rows[0];

        // Generate Installments (Weekly)
        for (let i = 1; i <= product.default_installments; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (i * 7)); // Simple weekly increment

            await client.query(
                `INSERT INTO mf_installments (loan_id, installment_no, due_date, amount_due, status)
                 VALUES ($1, $2, $3, $4, 'Pending')`,
                [loan.id, i, dueDate.toISOString().split('T')[0], installment_amount]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(loan);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 5. Repayments (Collection)
app.get('/api/collections/center/:centerId', async (req, res) => {
    const { centerId } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                c.id as customer_id, 
                c.full_name, 
                l.id as loan_id, 
                l.installment_amount,
                (SELECT id FROM mf_installments WHERE loan_id = l.id AND status != 'Paid' ORDER BY due_date ASC LIMIT 1) as next_installment_id
            FROM mf_customers c
            JOIN mf_loans l ON c.id = l.customer_id
            WHERE c.center_id = $1 AND l.status = 'Active'
        `, [centerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Analytics (Dashboard)
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM mf_customers) as total_customers,
                (SELECT COUNT(*) FROM mf_loans WHERE status = 'Active') as active_loans,
                (SELECT COALESCE(SUM(principal_amount), 0) FROM mf_loans) as total_disbursed,
                (SELECT COALESCE(SUM(amount_paid), 0) FROM mf_installments) as total_collected
        `);
        res.json(stats.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Data Sync Engine
app.post('/api/sync/excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse Excel from memory buffer
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Basic Analysis: Just return some stats to prove it works for now
        // In the next step, we will map this to the specific Arrears logic
        const recordCount = sheetData.length;
        console.log(`[SYNC] Parsed Excel File. Records found: ${recordCount}`);

        res.json({
            message: 'File processed successfully',
            recordsProcessed: recordCount,
            sampleData: sheetData.slice(0, 3) // Return 3 records as a preview
        });

    } catch (err) {
        console.error('[SYNC ERROR]', err);
        res.status(500).json({ error: 'Failed to process Excel file', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`[SERVER] Microfinance API running on port ${PORT}`);
});
