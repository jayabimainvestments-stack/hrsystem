const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Starting Payroll v2 Migration...');

        // 1. Add 'welfare' column to payroll table
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll' AND column_name='welfare') THEN 
                    ALTER TABLE payroll ADD COLUMN welfare NUMERIC DEFAULT 0; 
                END IF; 
            END $$;
        `);
        console.log('Added welfare column to payroll table');

        // 2. Create payroll_liabilities table
        await db.query(`
            CREATE TABLE IF NOT EXISTS payroll_liabilities (
                id SERIAL PRIMARY KEY,
                month VARCHAR(7) NOT NULL, -- YYYY-MM
                type VARCHAR(50) NOT NULL, -- EPF, ETF, Welfare
                total_payable NUMERIC DEFAULT 0,
                paid_amount NUMERIC DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Pending', -- Pending, Partial, Paid
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(month, type)
            );
        `);
        console.log('Created payroll_liabilities table');

        // 3. Populate existing liabilities from payroll table?
        // Would be good to recalculate history, but complex. Let's start fresh or simple agg.
        // Simple aggregation for past months:
        console.log('Calculating historical liabilities...');

        // EPF (Employer 12% + Employee 8%) -> Liability is usually total 20% to Govt.
        // Wait, EPF Employee is deducted, Employer is added on top. Liability = Both.
        // ETF = Employer 3%.

        // We'll aggregate from 'payroll' table + 'payroll_details'
        // Actually simplest is to aggregate columns from 'payroll' table if they exist.
        // epf_employee, epf_employer, etf_employer are in payroll table.

        const history = await db.query(`
            SELECT 
                month,
                SUM(epf_employee + epf_employer) as total_epf,
                SUM(etf_employer) as total_etf,
                SUM(COALESCE(welfare, 0)) as total_welfare
            FROM payroll
            GROUP BY month
        `);

        for (const row of history.rows) {
            // Upsert EPF
            if (parseFloat(row.total_epf) > 0) {
                await db.query(`
                    INSERT INTO payroll_liabilities (month, type, total_payable, status)
                    VALUES ($1, 'EPF', $2, 'Pending')
                    ON CONFLICT(month, type) DO UPDATE SET total_payable = EXCLUDED.total_payable
                `, [row.month, row.total_epf]);
            }

            // Upsert ETF
            if (parseFloat(row.total_etf) > 0) {
                await db.query(`
                    INSERT INTO payroll_liabilities (month, type, total_payable, status)
                    VALUES ($1, 'ETF', $2, 'Pending')
                    ON CONFLICT(month, type) DO UPDATE SET total_payable = EXCLUDED.total_payable
                `, [row.month, row.total_etf]);
            }

            // Upsert Welfare
            if (parseFloat(row.total_welfare) > 0) {
                await db.query(`
                    INSERT INTO payroll_liabilities (month, type, total_payable, status)
                    VALUES ($1, 'Welfare', $2, 'Pending')
                    ON CONFLICT(month, type) DO UPDATE SET total_payable = EXCLUDED.total_payable
                `, [row.month, row.total_welfare]);
            }
        }

        console.log('Historical liabilities populated');
        process.exit();

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
