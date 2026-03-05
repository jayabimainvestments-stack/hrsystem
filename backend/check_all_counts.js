const db = require('./config/db');

async function checkAllCounts() {
    try {
        // Get all table names
        const tablesRes = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const tables = tablesRes.rows.map(row => row.table_name);
        const counts = [];

        for (const table of tables) {
            try {
                const countRes = await db.query(`SELECT COUNT(*) as count FROM "${table}"`);
                counts.push({
                    Table: table,
                    Count: parseInt(countRes.rows[0].count, 10)
                });
            } catch (err) {
                console.error(`Error counting table ${table}:`, err.message);
                counts.push({ Table: table, Count: 'ERROR' });
            }
        }

        console.table(counts);
        process.exit(0);
    } catch (error) {
        console.error('Database Error:', error);
        process.exit(1);
    }
}

checkAllCounts();
