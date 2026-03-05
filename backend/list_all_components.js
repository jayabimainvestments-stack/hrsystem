const db = require('./config/db');

async function listAllComponents() {
    try {
        const result = await db.query("SELECT * FROM salary_components ORDER BY name");
        console.table(result.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listAllComponents();
