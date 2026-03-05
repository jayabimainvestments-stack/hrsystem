const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'hr_db', password: '123456', port: 5432
});

async function findFuel() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const tables = tablesRes.rows.map(r => r.table_name);

        for (const table of tables) {
            try {
                const colsRes = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                `, [table]);
                const cols = colsRes.rows.map(r => r.column_name);

                for (const col of cols) {
                    try {
                        const res = await pool.query(`SELECT * FROM ${table} WHERE "${col}"::text ILIKE '%Fuel%'`);
                        if (res.rows.length > 0) {
                            console.log(`FOUND in ${table}.${col}:`, JSON.stringify(res.rows, null, 2));
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        }
    } finally {
        await pool.end();
    }
}
findFuel();
