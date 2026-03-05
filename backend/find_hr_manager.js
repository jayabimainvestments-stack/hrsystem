const db = require('./config/db');

async function findHrManager() {
    try {
        console.log('--- FINDING HR MANAGER ---');
        const res = await db.query("SELECT * FROM users WHERE role = 'HR Manager'");
        if (res.rows.length === 0) {
            console.log('No HR Manager found.');
        } else {
            console.log('Found HR Manager(s):');
            console.log(res.rows);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

findHrManager();
