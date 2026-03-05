const db = require('./config/db');

async function restoreProtocols() {
    try {
        console.log('--- STARTING GLOBAL PROTOCOL RESTORATION ---');

        // 1. Restore Leave Protocols (Leave Types)
        const protocols = [
            { name: 'Annual Leave', is_paid: true, annual_limit: 14 },
            { name: 'Casual Leave', is_paid: true, annual_limit: 7 },
            { name: 'Sick Leave', is_paid: true, annual_limit: 7 },
            { name: 'Short Leave', is_paid: true, annual_limit: 0 },
            { name: 'Half Day', is_paid: true, annual_limit: 0 },
            { name: 'Duty Leave', is_paid: true, annual_limit: 0 },
            { name: 'No-Pay Leave', is_paid: false, annual_limit: 0 }
        ];

        console.log('Populating Leave Protocols...');
        for (const pt of protocols) {
            const exists = await db.query('SELECT id FROM leave_types WHERE name = $1', [pt.name]);
            if (exists.rows.length === 0) {
                await db.query(
                    'INSERT INTO leave_types (name, is_paid, annual_limit) VALUES ($1, $2, $3)',
                    [pt.name, pt.is_paid, pt.annual_limit]
                );
                console.log(`  + Created Protocol: ${pt.name}`);
            } else {
                console.log(`  . Protocol Exists: ${pt.name}`);
            }
        }

        // 2. Restore Tax Brackets
        const taxBrackets = [
            { min: 0, max: 100000, rate: 0 },
            { min: 100000.01, max: 141666.67, rate: 6 },
            { min: 141666.68, max: 183333.33, rate: 12 },
            { min: 183333.34, max: 225000, rate: 18 },
            { min: 225000.01, max: 266666.67, rate: 24 },
            { min: 266666.68, max: 308333.33, rate: 30 },
            { min: 308333.34, max: 999999999, rate: 36 }
        ];

        console.log('Populating Tax Brackets...');
        const tbCount = await db.query('SELECT count(*) FROM tax_brackets');
        if (parseInt(tbCount.rows[0].count) === 0) {
            for (const tb of taxBrackets) {
                await db.query(
                    'INSERT INTO tax_brackets (min_income, max_income, tax_rate) VALUES ($1, $2, $3)',
                    [tb.min, tb.max, tb.rate]
                );
            }
            console.log('  + Tax Brackets Initialized.');
        } else {
            console.log('  . Tax Brackets already populated.');
        }

        // 3. Restore Leave Balances for all users
        console.log('Synchronizing Leave Balances for 2026...');
        const users = await db.query('SELECT id FROM users');
        const types = await db.query('SELECT id, annual_limit FROM leave_types');
        const year = 2026;

        for (const user of users.rows) {
            for (const type of types.rows) {
                const balanceExists = await db.query(
                    'SELECT id FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
                    [user.id, type.id, year]
                );

                if (balanceExists.rows.length === 0) {
                    await db.query(
                        'INSERT INTO leave_balances (user_id, leave_type_id, year, allocated_days, used_days) VALUES ($1, $2, $3, $4, 0)',
                        [user.id, type.id, year, parseInt(type.annual_limit || 0)]
                    );
                }
            }
        }
        console.log(`  + Leave balances synchronized for ${users.rows.length} users.`);

        // 4. Verify Attendance Policy
        console.log('Verifying Attendance Policy...');
        const policyRes = await db.query('SELECT * FROM attendance_policies LIMIT 1');
        if (policyRes.rows.length > 0) {
            const policy = policyRes.rows[0];
            if (!policy.short_leave_monthly_limit || policy.short_leave_monthly_limit === 0) {
                await db.query('UPDATE attendance_policies SET short_leave_monthly_limit = 3, half_day_yearly_limit = 5 WHERE id = $1', [policy.id]);
                console.log('  + Attendance Policy limits restored.');
            }
        }

        console.log('--- RESTORATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('RESTORATION FAILED:', error);
        process.exit(1);
    }
}

restoreProtocols();
