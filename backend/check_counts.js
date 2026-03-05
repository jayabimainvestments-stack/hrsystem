const db = require('./config/db');

async function checkCounts() {
    try {
        const res = await db.query(`
            SELECT employee_id, COUNT(*) as count 
            FROM employee_salary_structure 
            GROUP BY employee_id
        `);
        console.table(res.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCounts();
