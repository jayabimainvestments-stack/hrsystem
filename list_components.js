const db = require('./backend/config/db');

async function listComponents() {
    try {
        const res = await db.query('SELECT id, name, type FROM salary_components ORDER BY id');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listComponents();
