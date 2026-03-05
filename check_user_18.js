const db = require('./backend/config/db');

async function checkUser() {
    try {
        const res = await db.query('SELECT * FROM users WHERE id = 18');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
