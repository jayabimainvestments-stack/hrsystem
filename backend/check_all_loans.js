const db = require('./config/db');

async function listTables() {
    try {
        console.log('--- Database Tables ---');
        const result = await db.query(`
            SELECT el.*, u.name as employee_name 
            FROM employee_loans el
            JOIN employees e ON el.employee_id = e.id
            JOIN users u ON e.user_id = u.id
        `);
        console.log('--- Migrated Loans in Tracker ---');
        console.log(JSON.stringify(result.rows, null, 2));
        console.log('--- Recent Deletion Audit Logs ---');
        console.log(JSON.stringify(result.rows, null, 2));
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

listTables();
