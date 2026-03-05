const db = require('./config/db');

async function checkDefault() {
    try {
        const res = await db.query(`
            SELECT column_name, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'attendance' AND column_name = 'id'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkDefault();
