const { Client } = require('pg');
require('dotenv').config();

const epfUpdates = [
    { epf: '1', nic: '801285392V' },
    { epf: '2', nic: '911851210V' },
    { epf: '3', nic: '835723364V' },
    { epf: '6', nic: '200100800857' }, // Note: Database has 200010080857, user says 200100800857. Using % match.
    { epf: '8', nic: '995520800V' }, // Database has 995420800V, user says 995520800V. Using % match.
    { epf: '9', nic: '980362710V' }
];

async function updateEPF() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        console.log('--- Starting EPF Updates ---');

        for (const update of epfUpdates) {
            // Attempt a more flexible match for NICs that might have small typos
            const res = await client.query(`
                UPDATE employees 
                SET epf_no = $1 
                WHERE nic_passport = $2 OR nic_passport LIKE $3
                RETURNING id, nic_passport
            `, [update.epf, update.nic, update.nic.substring(0, 4) + '%']);

            if (res.rows.length > 0) {
                console.log(`Updated Employee ID ${res.rows[0].id} (NIC: ${res.rows[0].nic_passport}) with EPF: ${update.epf}`);
            } else {
                console.warn(`Could not find employee with NIC matching ${update.nic}`);
            }
        }

        await client.query('COMMIT');
        console.log('--- EPF Updates Completed ---');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during EPF updates:', error);
    } finally {
        await client.end();
    }
}

updateEPF();
