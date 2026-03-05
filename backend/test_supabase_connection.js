const { Client } = require('pg');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testConnection() {
    const client = new Client({
        user: 'postgres.miikoefhdzkaoaukaftm',
        host: 'aws-1-ap-northeast-1.pooler.supabase.com',
        database: 'postgres',
        password: 'Jayabima@2026',
        port: 6543,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Successfully connected!');

        const res = await client.query('SELECT COUNT(*) FROM public.employees');
        console.log('Employee count:', res.rows[0].count);

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

testConnection();
