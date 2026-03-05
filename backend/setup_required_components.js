const db = require('./config/db');

async function setupComponents() {
    const required = [
        { name: 'Basic pay', type: 'Earning' },
        { name: 'Annual Perfomance', type: 'Earning' },
        { name: 'Travelling', type: 'Earning' },
        { name: 'Motorcycle maintenance', type: 'Earning' }
    ];

    try {
        console.log('--- Checking Salary Components ---');
        const components = await db.query('SELECT * FROM salary_components');
        const existingNames = components.rows.map(c => c.name.toLowerCase().trim());

        const ids = {};
        for (const req of required) {
            const normalizedReq = req.name.toLowerCase().trim();
            let componentId;

            if (!existingNames.includes(normalizedReq)) {
                console.log(`Creating component: ${req.name}`);
                const res = await db.query(
                    'INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible) VALUES ($1, $2, true, true, true) RETURNING id',
                    [req.name, req.type]
                );
                componentId = res.rows[0].id;
            } else {
                componentId = components.rows.find(c => c.name.toLowerCase().trim() === normalizedReq).id;
                console.log(`Found existing component: ${req.name} (ID: ${componentId})`);
            }
            ids[req.name] = componentId;
        }

        console.log('\n--- Checking Employees ---');
        // Joining with users to get the name for logging
        const employees = await db.query(`
            SELECT e.id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);
        console.log(`Found ${employees.rows.length} active employees.`);

        for (const emp of employees.rows) {
            console.log(`Checking structure for: ${emp.name}`);
            const currentStructure = await db.query(
                'SELECT component_id FROM employee_salary_structure WHERE employee_id = $1',
                [emp.id]
            );
            const currentIds = new Set(currentStructure.rows.map(r => r.component_id));

            for (const [name, id] of Object.entries(ids)) {
                if (!currentIds.has(id)) {
                    console.log(`  Adding ${name} to ${emp.name}`);
                    await db.query(
                        'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, 0)',
                        [emp.id, id]
                    );
                }
            }
        }

        console.log('\n--- Done ---');
        process.exit(0);
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

setupComponents();
