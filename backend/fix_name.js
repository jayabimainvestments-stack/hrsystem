const db = require('./config/db');

async function fixName() {
    try {
        await db.query(`
            UPDATE users 
            SET name = 'DISSANAYAKE MUDIYANSELAGE KRISHANTHA MAITHREE DISSANAYAKE' 
            WHERE id = (SELECT user_id FROM employees WHERE nic_passport = '801285392V' OR id = 27 LIMIT 1)
        `);
        console.log("Name updated successfully");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixName();
