const { Client } = require('pg');
require('dotenv').config();

async function checkConstraints() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        console.log('--- Unique Indexes for monthly_salary_overrides ---');
        const indexRes = await client.query(`
            SELECT pg_get_indexdef(indexrelid) as def
            FROM pg_index 
            WHERE indrelid = 'monthly_salary_overrides'::regclass AND indisunique = true
        `);
        console.log(JSON.stringify(indexRes.rows, null, 2));

        console.log('\n--- Constraints for monthly_salary_overrides ---');
        const constRes = await client.query(`
            SELECT conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND conrelid = 'monthly_salary_overrides'::regclass
        `);
        console.log(JSON.stringify(constRes.rows, null, 2));

    } catch (error) {
        console.error('Error checking constraints:', error);
    } finally {
        await client.end();
    }
}

checkConstraints();
