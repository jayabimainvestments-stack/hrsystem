const db = require('./config/db');

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS monthly_salary_overrides (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                month VARCHAR(7) NOT NULL,
                component_id INTEGER NOT NULL REFERENCES salary_components(id),
                amount NUMERIC(12,2) DEFAULT 0,
                quantity NUMERIC(10,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Draft',
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(employee_id, month, component_id)
            )
        `);
        console.log('✅ monthly_salary_overrides table created');
        process.exit(0);
    } catch (err) {
        console.error('❌', err.message);
        process.exit(1);
    }
}
createTable();
