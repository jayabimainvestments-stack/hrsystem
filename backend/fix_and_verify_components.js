const db = require('./config/db');

async function fixAndVerify() {
    const required = [
        { name: 'Basic pay', type: 'Earning' },
        { name: 'Annual Performance', type: 'Earning' }, // Fixed spelling
        { name: 'Travelling', type: 'Earning' },
        { name: 'Motorcycle maintenance', type: 'Earning' }
    ];

    try {
        console.log('--- Checking components ---');
        const ids = {};
        for (const req of required) {
            // Check if exists (case insensitive, trim)
            const check = await db.query(
                'SELECT id FROM salary_components WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
                [req.name]
            );

            let id;
            if (check.rows.length === 0) {
                console.log(`Creating ${req.name}...`);
                const ins = await db.query(
                    'INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible) VALUES ($1, $2, true, true, true) RETURNING id',
                    [req.name, req.type]
                );
                id = ins.rows[0].id;
            } else {
                id = check.rows[0].id;
                console.log(`Found ${req.name}: ID ${id}`);
            }
            ids[req.name] = id;
        }

        const employees = await db.query(`
            SELECT e.id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);

        for (const emp of employees.rows) {
            console.log(`\nEmployee: ${emp.name} (ID: ${emp.id})`);
            for (const [name, id] of Object.entries(ids)) {
                const has = await db.query(
                    'SELECT 1 FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [emp.id, id]
                );
                if (has.rows.length === 0) {
                    console.log(`  Adding ${name}...`);
                    await db.query(
                        'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, 0)',
                        [emp.id, id]
                    );
                } else {
                    console.log(`  Already has ${name}.`);
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixAndVerify();
