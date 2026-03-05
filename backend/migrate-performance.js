const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Create Tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS performance_metric_ranges (
                id SERIAL PRIMARY KEY,
                metric_id INTEGER REFERENCES performance_metrics(id) ON DELETE CASCADE,
                mark INTEGER NOT NULL,
                min_value NUMERIC NOT NULL,
                max_value NUMERIC NOT NULL,
                is_descending BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS performance_weekly_data (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                metric_id INTEGER REFERENCES performance_metrics(id) ON DELETE CASCADE,
                value NUMERIC NOT NULL,
                week_starting DATE NOT NULL,
                recorded_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS performance_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tables created successfully');

        // 2. Seed Settings
        await client.query(`
            INSERT INTO performance_settings (key, value)
            VALUES ('point_value', '1000')
            ON CONFLICT (key) DO NOTHING;
        `);

        // 3. Seed Metrics and Ranges
        const metrics = [
            {
                name: 'LOAN AMOUNT',
                ranges: [
                    { mark: 1, min: 200000, max: 299999 },
                    { mark: 2, min: 300000, max: 399999 },
                    { mark: 3, min: 400000, max: 499999 },
                    { mark: 4, min: 500000, max: 599999 }
                ]
            },
            {
                name: 'DEFAULT',
                ranges: [
                    { mark: 1, min: 40000, max: 60000, desc: true },
                    { mark: 2, min: 30001, max: 40000, desc: true },
                    { mark: 3, min: 20001, max: 30000, desc: true },
                    { mark: 4, min: 10000, max: 20000, desc: true }
                ]
            },
            {
                name: 'TOTAL CUSTOMER',
                ranges: [
                    { mark: 1, min: 100, max: 199 },
                    { mark: 2, min: 200, max: 299 },
                    { mark: 3, min: 300, max: 399 },
                    { mark: 4, min: 400, max: 499 }
                ]
            },
            {
                name: 'COLLECTION',
                ranges: [
                    { mark: 1, min: 350000, max: 399999 },
                    { mark: 2, min: 400000, max: 499999 },
                    { mark: 3, min: 500000, max: 599999 },
                    { mark: 4, min: 600000, max: 699999 }
                ]
            }
        ];

        for (const m of metrics) {
            const mRes = await client.query(
                `INSERT INTO performance_metrics (name) VALUES ($1) RETURNING id`,
                [m.name]
            );
            const metricId = mRes.rows[0].id;

            for (const r of m.ranges) {
                await client.query(
                    `INSERT INTO performance_metric_ranges (metric_id, mark, min_value, max_value, is_descending)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [metricId, r.mark, r.min, r.max, r.desc || false]
                );
            }
        }

        console.log('Metrics and ranges seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
