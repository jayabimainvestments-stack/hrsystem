const { Pool } = require('pg');
require('dotenv').config();

console.log('Testing connection to:', process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Connection FAILED:', err.message);
        console.error('Code:', err.code);
        console.error('Address:', err.address);
        console.error('Port:', err.port);
        console.log('\nSUGGESTION:');
        if (err.code === 'ECONNREFUSED') {
            console.log('1. Check if PostgreSQL service is running.');
            console.log('2. Verify the port is 5432.');
        } else if (err.code === '28P01') { // invalid_password
            console.log('1. Check your password in backend/.env');
        } else if (err.code === '3D000') { // invalid_catalog_name
            console.log('1. Database "hr_db" does not exist. Please create it.');
        }
    } else {
        console.log('Connection SUCCESSFUL!');
        release();
    }
    process.exit();
});
