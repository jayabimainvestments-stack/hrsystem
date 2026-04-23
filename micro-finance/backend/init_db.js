const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function initDB() {
    try {
        console.log('[*] Reading schema.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        
        console.log('[*] Executing schema in database...');
        await pool.query(sql);
        
        console.log('[OK] Database schema initialized successfully.');
    } catch (err) {
        console.error('[ERR] Failed to initialize database:', err.message);
    } finally {
        await pool.end();
    }
}

initDB();
