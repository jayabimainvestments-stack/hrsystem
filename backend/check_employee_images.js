const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function checkEmployeeImages() {
    try {
        console.log("\n=== CHECKING EMPLOYEE IMAGES ===\n");
        // We don't know the column name yet, so we'll select * and limit 1 to see keys
        const result = await db.query("SELECT * FROM employees LIMIT 1");
        if (result.rows.length > 0) {
            console.log("Keys in employee record:", Object.keys(result.rows[0]));

            // Try to find the image column
            const keys = Object.keys(result.rows[0]);
            const imageCol = keys.find(k => k.includes('image') || k.includes('photo') || k.includes('pic') || k.includes('profile'));

            if (imageCol) {
                console.log(`\nFound potential image column: '${imageCol}'`);
                const images = await db.query(`SELECT id, name, ${imageCol} FROM employees WHERE ${imageCol} IS NOT NULL LIMIT 5`);
                console.table(images.rows);
            } else {
                console.log("\n❌ Could not identify an image column in the keys.");
            }
        } else {
            console.log("No employees found.");
        }
        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkEmployeeImages();
