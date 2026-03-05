const db = require('./config/db');

async function listDeductions() {
    try {
        const result = await db.query("SELECT * FROM salary_components WHERE type = 'Deduction'");
        console.table(result.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listDeductions();
