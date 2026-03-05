const db = require('./config/db');

const checkTables = async () => {
    try {
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables in database:', res.rows.map(row => row.table_name));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkTables();
