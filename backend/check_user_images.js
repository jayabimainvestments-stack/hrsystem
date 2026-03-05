const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function checkUserImages() {
    try {
        console.log("\n=== CHECKING USER IMAGES ===\n");
        const result = await db.query(`
            SELECT id, name, email, role, profile_picture 
            FROM users 
            WHERE profile_picture IS NOT NULL 
            LIMIT 10
        `);

        if (result.rows.length > 0) {
            console.table(result.rows);
        } else {
            console.log("No users found with a profile picture.");
        }

        console.log("\n=== CHECKING TOTAL USERS WITH PICTURES ===\n");
        const count = await db.query("SELECT COUNT(*) FROM users WHERE profile_picture IS NOT NULL");
        console.log(`Total users with profile picture: ${count.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

checkUserImages();
