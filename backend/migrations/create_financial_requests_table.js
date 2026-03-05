const db = require('../config/db');

async function createFinancialRequestsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS financial_requests (
                id SERIAL PRIMARY KEY,
                month VARCHAR(7) NOT NULL, -- YYYY-MM
                type VARCHAR(50) NOT NULL, -- Fuel Allowance, etc.
                data JSONB NOT NULL, -- Array of { employee_id, amount, liters, etc. }
                requested_by INT REFERENCES users(id),
                approved_by INT REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table financial_requests created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createFinancialRequestsTable();
