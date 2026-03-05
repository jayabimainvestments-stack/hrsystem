const db = require('./config/db');

const updateSchema = async () => {
    try {
        await db.query('BEGIN');

        console.log('Creating financial_requests table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS financial_requests (
                id SERIAL PRIMARY KEY,
                month VARCHAR(7) NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'Pending',
                data JSONB NOT NULL,
                requested_by INT,
                approved_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Adding is_locked to employee_salary_structure...');
        await db.query(`
            ALTER TABLE employee_salary_structure 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
        `);

        console.log('Adding lock_reason to employee_salary_structure...');
        await db.query(`
            ALTER TABLE employee_salary_structure 
            ADD COLUMN IF NOT EXISTS lock_reason TEXT;
        `);

        await db.query('COMMIT');
        console.log('Schema updated successfully.');
        process.exit();
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating schema:', error);
        process.exit(1);
    }
};

updateSchema();
