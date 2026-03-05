const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Starting Payroll Liabilities Extension Migration...');

        // Add payment metadata columns to payroll_liabilities table
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_liabilities' AND column_name='payment_ref') THEN 
                    ALTER TABLE payroll_liabilities ADD COLUMN payment_ref VARCHAR(100); 
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_liabilities' AND column_name='payment_date') THEN 
                    ALTER TABLE payroll_liabilities ADD COLUMN payment_date DATE; 
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_liabilities' AND column_name='payment_method') THEN 
                    ALTER TABLE payroll_liabilities ADD COLUMN payment_method VARCHAR(50); 
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_liabilities' AND column_name='notes') THEN 
                    ALTER TABLE payroll_liabilities ADD COLUMN notes TEXT; 
                END IF;
            END $$;
        `);
        console.log('Added payment metadata columns to payroll_liabilities table');

        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
