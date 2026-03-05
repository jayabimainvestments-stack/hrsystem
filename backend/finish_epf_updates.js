const { Client } = require('pg');
require('dotenv').config();

async function finishUpdates() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // Update Nishshanka (User ID 39) -> EPF 6
        await client.query('UPDATE employees SET epf_no = $1 WHERE user_id = $2', ['6', 39]);
        console.log('Updated Nishshanka with EPF 6');

        // Update Herath (User ID 40) -> EPF 8
        await client.query('UPDATE employees SET epf_no = $1 WHERE user_id = $2', ['8', 40]);
        console.log('Updated Herath with EPF 8');

        await client.query('COMMIT');

        const finalCheck = await client.query('SELECT user_id, nic_passport, epf_no FROM employees ORDER BY epf_no::integer ASC');
        console.log('Final Database State:');
        console.log(JSON.stringify(finalCheck.rows, null, 2));

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during final EPF updates:', error);
    } finally {
        await client.end();
    }
}

finishUpdates();
