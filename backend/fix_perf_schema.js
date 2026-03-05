const db = require('./config/db');
require('dotenv').config();

async function migrate() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Migrating performance_weekly_data...');
        // Add week_ending if missing
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_weekly_data' AND column_name='week_ending') THEN
                    ALTER TABLE performance_weekly_data ADD COLUMN week_ending DATE;
                END IF;
            END $$;
        `);

        // Add status if missing
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_weekly_data' AND column_name='status') THEN
                    ALTER TABLE performance_weekly_data ADD COLUMN status VARCHAR(20) DEFAULT 'Pending';
                END IF;
            END $$;
        `);

        // Add payroll_month if missing
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_weekly_data' AND column_name='payroll_month') THEN
                    ALTER TABLE performance_weekly_data ADD COLUMN payroll_month VARCHAR(7);
                END IF;
            END $$;
        `);

        console.log('Fixing performance_monthly_approvals...');
        // Drop and recreate to ensure correct schema since it was empty
        await client.query('DROP TABLE IF EXISTS performance_monthly_approvals CASCADE');
        await client.query(`
            CREATE TABLE performance_monthly_approvals (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                month VARCHAR(7) NOT NULL,
                total_marks NUMERIC DEFAULT 0,
                total_amount NUMERIC DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Pending',
                approved_by INTEGER REFERENCES users(id),
                approved_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, month)
            )
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
    }
}
migrate();
