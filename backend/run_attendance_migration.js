const db = require('./config/db');

async function migrate() {
    try {
        // 1. Create attendance_policies table
        await db.query(`
            CREATE TABLE IF NOT EXISTS attendance_policies (
                id SERIAL PRIMARY KEY,
                work_start_time TIME NOT NULL DEFAULT '08:00:00',
                work_end_time TIME NOT NULL DEFAULT '16:30:00',
                short_leave_monthly_limit INTEGER DEFAULT 2,
                half_day_yearly_limit INTEGER DEFAULT 4,
                absent_deduction_rate DECIMAL(10, 2) DEFAULT 1.0,
                late_hourly_rate DECIMAL(10, 2) DEFAULT 0.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ attendance_policies table created');

        // 2. Add absent_day_amount column if missing
        await db.query(`ALTER TABLE attendance_policies ADD COLUMN IF NOT EXISTS absent_day_amount NUMERIC DEFAULT 0;`);
        console.log('✓ absent_day_amount column ensured');

        // 3. Update attendance table for granular tracking
        await db.query(`
            ALTER TABLE attendance 
            ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS short_leave_hours DECIMAL(4, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE;
        `);
        console.log('✓ attendance table columns updated');

        // 4. Seed default policy if no policy exists
        await db.query(`
            INSERT INTO attendance_policies (work_start_time, work_end_time, short_leave_monthly_limit, half_day_yearly_limit)
            SELECT '08:30:00', '16:30:00', 2, 4
            WHERE NOT EXISTS (SELECT 1 FROM attendance_policies);
        `);
        console.log('✓ Default policy seeded');

        // 5. Add short leave / half day leave types
        await db.query(`
            INSERT INTO leave_types (name, is_paid, annual_limit)
            VALUES 
            ('Short Leave', true, 0),
            ('Half Day', true, 0)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✓ Leave types ensured');

        // Verify
        const policy = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        console.log('\n--- Current Policy ---');
        console.log(JSON.stringify(policy.rows[0], null, 2));
        console.log('\n✓ Deduction Protocols should now work!');

    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        process.exit();
    }
}

migrate();
