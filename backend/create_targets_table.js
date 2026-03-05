const db = require('./config/db');

async function createTargetsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_performance_targets (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                metric_id INTEGER REFERENCES performance_metrics(id) ON DELETE CASCADE,
                mark INTEGER NOT NULL,
                min_value NUMERIC NOT NULL,
                max_value NUMERIC NOT NULL,
                is_descending BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, metric_id, mark)
            )
        `);
        console.log('Employee performance targets table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create targets table:', err);
        process.exit(1);
    }
}

createTargetsTable();
