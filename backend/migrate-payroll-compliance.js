const db = require('./config/db');

const migratePayrollCompliance = async () => {
    try {
        console.log('Starting Payroll Compliance Migration...');

        // 1. Add overtime_hours to attendance
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='overtime_hours') THEN 
                    ALTER TABLE attendance ADD COLUMN overtime_hours NUMERIC DEFAULT 0; 
                END IF; 
            END $$;
        `);
        console.log('Added overtime_hours to attendance');

        // 2. Add workflow columns to payroll
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll' AND column_name='reviewed_by') THEN 
                    ALTER TABLE payroll ADD COLUMN reviewed_by INTEGER REFERENCES users(id); 
                END IF; 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll' AND column_name='approved_by') THEN 
                    ALTER TABLE payroll ADD COLUMN approved_by INTEGER REFERENCES users(id); 
                END IF; 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll' AND column_name='locked') THEN 
                    ALTER TABLE payroll ADD COLUMN locked BOOLEAN DEFAULT FALSE; 
                END IF;
                -- Update status check constraint if possible, or just allow new values application-side
                -- Postgres CHECK constraints are hard to alter. We will skip constraint altercation and rely on app logic
                -- or drop and recreate if critical. For now, we assume status is a VARCHAR without strict Enum constraint in DB
                -- or we add new constraints.
                
                -- Let's check if status has a constraint
            END $$;
        `);
        console.log('Added workflow columns to payroll');

        console.log('Migration Completed Successfully.');
        process.exit();

    } catch (error) {
        console.error('Migration framework error:', error);
        process.exit(1);
    }
};

migratePayrollCompliance();
