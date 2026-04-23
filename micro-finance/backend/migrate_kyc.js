const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log('[*] Starting KYC Schema Migration...');
        
        const queries = [
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS civil_status VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS postal_address TEXT`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS phone_home VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS spouse_nic VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(15,2)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_1_name VARCHAR(255)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_1_nic VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_1_phone VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_2_name VARCHAR(255)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_2_nic VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS guarantor_2_phone VARCHAR(20)`,
            `ALTER TABLE mf_customers ADD COLUMN IF NOT EXISTS biometric_id INTEGER`
        ];

        for (let q of queries) {
            await pool.query(q);
        }

        console.log('[OK] KYC Schema Migration completed successfully.');
    } catch (err) {
        console.error('[ERR] Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
