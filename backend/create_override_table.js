const db = require('./config/db');

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS monthly_salary_overrides (
                id SERIAL PRIMARY KEY,
                employee_id INT REFERENCES employees(id),
                month VARCHAR(7), -- YYYY-MM
                component_id INT REFERENCES salary_components(id),
                amount DECIMAL(15,2),
                quantity DECIMAL(15,2),
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(employee_id, month, component_id)
            )
        `);
        console.log('monthly_salary_overrides table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createTable();
