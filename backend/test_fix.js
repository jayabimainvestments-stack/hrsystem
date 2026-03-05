const db = require('./config/db');

async function verify() {
    try {
        console.log('Testing weekly performance save (UPSERT)...');

        // Mock data
        const payload = {
            employee_id: 1, // Assuming employee 1 exists
            week_starting: '2026-02-16',
            entries: [
                { metric_id: 1, value: 500000 },
                { metric_id: 1, value: 550000 } // Test second entry for same metric in same week
            ]
        };

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const entry of payload.entries) {
                await client.query(`
                    INSERT INTO performance_weekly_data (employee_id, metric_id, value, week_starting, recorded_by)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (employee_id, metric_id, week_starting) 
                    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                `, [payload.employee_id, entry.metric_id, entry.value, payload.week_starting, 1]);
            }
            await client.query('COMMIT');
            console.log('✅ Save successful!');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Save failed:', e.message);
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (err) {
        console.error('Test script failed:', err);
        process.exit(1);
    }
}

verify();
