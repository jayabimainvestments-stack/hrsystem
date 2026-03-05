const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Creating performance_monthly_approvals table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS performance_monthly_approvals (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                month VARCHAR(7) NOT NULL, -- YYYY-MM
                total_marks NUMERIC NOT NULL,
                total_amount NUMERIC NOT NULL,
                status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
                approved_by INTEGER REFERENCES users(id),
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, month)
            );
        `);
        console.log('✅ Table created successfully!');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
