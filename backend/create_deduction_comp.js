const db = require('./config/db');

async function createDeduction() {
    try {
        const result = await db.query(
            "INSERT INTO salary_components (name, type) VALUES ($1, $2) RETURNING *",
            ['Late/Absence Deduction', 'Deduction']
        );
        console.table(result.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

createDeduction();
