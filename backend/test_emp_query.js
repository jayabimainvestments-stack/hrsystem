require('dotenv').config();
const db = require('./config/db');

async function testLoginAndFetch() {
    try {
        console.log("Testing DB connection...");
        const result = await db.query(`
            SELECT e.*, u.name, u.email, u.role 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
        `);
        console.log("DB Query Success. Rows:", result.rows.length);
        if (result.rows.length > 0) {
            console.log("Sample User:", result.rows[0].name, result.rows[0].email, result.rows[0].role);
        } else {
            console.log("No employees found.");
        }
        process.exit(0);

    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
}

testLoginAndFetch();
