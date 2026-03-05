const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    try {
        console.log('--- Creating attendance_deductions table ---');
        await pool.query(`
            CREATE TYPE deduction_status_enum AS ENUM (
                'Pending', 
                'Approved_Level_1', 
                'Approved_Level_2', 
                'Rejected', 
                'Processed'
            );
        `);
    } catch (e) {
        // Enum might already exist, ignore error or check specifically
        console.log('Enum deduction_status_enum might already exist, proceeding...');
    }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_deductions (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                deduct_days DECIMAL(10, 2) DEFAULT 0,
                deduct_day_rate DECIMAL(15, 2) NOT NULL,
                deduct_hours DECIMAL(10, 2) DEFAULT 0,
                deduct_hour_rate DECIMAL(15, 2) NOT NULL,
                total_amount DECIMAL(15, 2) NOT NULL,
                reason TEXT,
                status deduction_status_enum DEFAULT 'Pending',
                approved_by_1 INTEGER REFERENCES users(id),
                approved_at_1 TIMESTAMP,
                approved_by_2 INTEGER REFERENCES users(id),
                approved_at_2 TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table attendance_deductions created successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
