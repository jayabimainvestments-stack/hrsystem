const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function recreateTable() {
    try {
        console.log('--- Recreating attendance_deductions Table ---');

        const createSql = `
            CREATE TABLE IF NOT EXISTS attendance_deductions (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                month VARCHAR(7) NOT NULL, -- YYYY-MM
                deduct_days DECIMAL(10, 2) DEFAULT 0,
                deduct_day_rate DECIMAL(10, 2) DEFAULT 0,
                deduct_hours DECIMAL(10, 2) DEFAULT 0,
                deduct_hour_rate DECIMAL(10, 2) DEFAULT 0,
                total_amount DECIMAL(10, 2) DEFAULT 0,
                reason TEXT,
                status VARCHAR(20) DEFAULT 'Pending',
                approved_by_1 INTEGER REFERENCES users(id),
                approved_at_1 TIMESTAMP,
                approved_by_2 INTEGER REFERENCES users(id),
                approved_at_2 TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Add unique constraint to prevent duplicate entries for same employee/month
            ALTER TABLE attendance_deductions DROP CONSTRAINT IF EXISTS unique_emp_month_deduction;
            ALTER TABLE attendance_deductions ADD CONSTRAINT unique_emp_month_deduction UNIQUE (employee_id, month);

            -- Indices for performance
            CREATE INDEX IF NOT EXISTS idx_att_ded_month ON attendance_deductions(month);
            CREATE INDEX IF NOT EXISTS idx_att_ded_emp ON attendance_deductions(employee_id);
        `;

        await pool.query(createSql);
        console.log('Table attendance_deductions recreated successfully.');

    } catch (err) {
        console.error('RECREATE ERROR:', err);
    } finally {
        await pool.end();
    }
}

recreateTable();
