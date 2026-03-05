const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    try {
        console.log('--- Creating employee_loans table ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_loans (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                loan_date DATE NOT NULL,
                total_amount DECIMAL(15, 2) NOT NULL,
                installment_amount DECIMAL(15, 2) NOT NULL,
                num_installments INTEGER NOT NULL,
                installments_paid INTEGER DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                requested_by INTEGER REFERENCES users(id),
                approved_by INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table created successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
