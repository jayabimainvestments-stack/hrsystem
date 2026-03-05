const db = require('../config/db');

async function addQuantityColumn() {
    try {
        console.log('Adding quantity column to employee_salary_structure...');
        await db.query('ALTER TABLE employee_salary_structure ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0');
        console.log('Successfully added quantity column.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        process.exit();
    }
}

addQuantityColumn();
