const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5432/hr_db'
});

const backupFile = 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/DATABASE_BACKUP/hr_db_full_backup.sql';

async function restore() {
    try {
        const content = fs.readFileSync(backupFile, 'utf8');

        // 1. Extract and restore performance_metrics
        console.log('Restoring performance_metrics...');
        const metricsMatch = content.match(/COPY public\.performance_metrics .*?FROM stdin;([\s\S]*?)\\\./);
        if (metricsMatch) {
            const metricsLines = metricsMatch[1].trim().split('\n');
            for (const line of metricsLines) {
                const [id, name, description, order_index, created_at] = line.split('\t');
                await pool.query(
                    'INSERT INTO performance_metrics (id, name, description, order_index, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                    [id, name, description === '\\N' ? null : description, order_index, created_at]
                );
            }
            console.log(`Restored ${metricsLines.length} metrics.`);
        } else {
            console.log('No metrics found in backup.');
        }

        // 2. Extract and restore employee_performance_targets
        console.log('Restoring employee_performance_targets...');
        const targetsMatch = content.match(/COPY public\.employee_performance_targets .*?FROM stdin;([\s\S]*?)\\\./);
        if (targetsMatch) {
            const targetsLines = targetsMatch[1].trim().split('\n');
            let restoredTargets = 0;
            for (const line of targetsLines) {
                const [id, employee_id, metric_id, mark, min_value, max_value, is_descending, created_at, updated_at] = line.split('\t');

                // Verify employee exists before inserting target
                const empCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
                if (empCheck.rows.length > 0) {
                    await pool.query(
                        'INSERT INTO employee_performance_targets (id, employee_id, metric_id, mark, min_value, max_value, is_descending, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [id, employee_id, metric_id, mark, min_value, max_value, is_descending === 't', created_at, updated_at]
                    );
                    restoredTargets++;
                } else {
                    console.log(`Skipping target for non-existent employee ID: ${employee_id}`);
                }
            }
            console.log(`Restored ${restoredTargets} targets.`);
        } else {
            console.log('No targets found in backup.');
        }

        await pool.end();
        console.log('Restoration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Restoration failed:', err);
        process.exit(1);
    }
}

restore();
