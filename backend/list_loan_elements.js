const { Client } = require('pg');
require('dotenv').config();

async function listLoanTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // List all tables with 'loan' in name
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%loan%' AND table_schema = 'public'
        `);
        console.log('Tables with loan in name:', tables.rows);

        // Also check salary_components for loan-related types
        const components = await client.query(`
            SELECT id, name, type, category FROM salary_components WHERE name ILIKE '%loan%' OR type ILIKE '%loan%'
        `);
        console.log('Salary components related to loans:', components.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listLoanTables();
