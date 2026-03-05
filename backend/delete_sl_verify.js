require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

async function cleanup() {
    try {
        console.log("Removing 'SL Verify' users...");

        // 1. Get IDs
        const res = await db.query("SELECT id FROM users WHERE name = 'SL Verify'");
        const ids = res.rows.map(r => r.id);

        if (ids.length === 0) {
            console.log("No users found.");
            process.exit(0);
        }

        console.log("Found User IDs:", ids);

        for (const id of ids) {
            // Delete related data (cascade usually handles this but let's be safe/explicit if needed, 
            // but standard DELETE FROM users should work if ON DELETE CASCADE is set, 
            // otherwise delete from children first)

            // Check employees
            await db.query("DELETE FROM employees WHERE user_id = $1", [id]);
            await db.query("DELETE FROM employee_bank_details WHERE user_id = $1", [id]);

            // Check payroll (if any)
            await db.query("DELETE FROM payroll WHERE user_id = $1", [id]);

            // Delete User
            await db.query("DELETE FROM users WHERE id = $1", [id]);
        }

        console.log("Cleanup complete.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
cleanup();
