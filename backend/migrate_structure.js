const db = require('./config/db');

async function migrate() {
    try {
        console.log('Adding installments_remaining column...');
        await db.query('ALTER TABLE employee_salary_structure ADD COLUMN IF NOT EXISTS installments_remaining integer');
        console.log('Column added successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();
