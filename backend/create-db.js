const { Client } = require('pg');
require('dotenv').config();

// Connect to default 'postgres' database to create new db
const connectionString = process.env.DATABASE_URL.replace('/hr_db', '/postgres');

const client = new Client({
    connectionString: connectionString,
});

async function createDatabase() {
    try {
        await client.connect();
        console.log('Connected to postgres database.');

        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'hr_db'");
        if (res.rows.length === 0) {
            await client.query('CREATE DATABASE hr_db');
            console.log('Database hr_db created successfully.');
        } else {
            console.log('Database hr_db already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err.message);
    } finally {
        await client.end();
    }
}

createDatabase();
