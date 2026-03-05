const db = require('./config/db');

async function seedOrgData() {
    try {
        // First check what departments already exist
        const existingDepts = await db.query('SELECT * FROM departments');
        console.log('Existing departments:', existingDepts.rows.length);

        if (existingDepts.rows.length === 0) {
            // Get unique departments from employees table
            const empDepts = await db.query('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL');
            console.log('Employee departments found:', empDepts.rows.map(r => r.department));

            // Insert departments based on employee data + common ones
            const departments = [
                { name: 'Board and Executive Management', code: 'BEM-01' },
                { name: 'Credit/Lending', code: 'CRD-01' },
                { name: 'Finance and Accounting', code: 'FIN-01' },
                { name: 'IT', code: 'IT-01' },
                { name: 'Human Resources', code: 'HR-01' },
                { name: 'Operations', code: 'OPS-01' },
                { name: 'Marketing', code: 'MKT-01' },
                { name: 'Customer Service', code: 'CS-01' },
            ];

            for (const dept of departments) {
                try {
                    const result = await db.query(
                        'INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *',
                        [dept.name, dept.code]
                    );
                    console.log('  Created department:', result.rows[0].name, '(ID:', result.rows[0].id + ')');
                } catch (e) {
                    if (e.code === '23505') {
                        console.log('  Department already exists:', dept.name);
                    } else {
                        console.error('  Error creating department:', dept.name, e.message);
                    }
                }
            }
        }

        // Get fresh departments for designation FK
        const depts = await db.query('SELECT * FROM departments');
        const deptMap = {};
        depts.rows.forEach(d => {
            deptMap[d.name.toLowerCase()] = d.id;
        });
        console.log('\nDepartment IDs:', deptMap);

        // Check existing designations
        const existingDesigs = await db.query('SELECT * FROM designations');
        console.log('\nExisting designations:', existingDesigs.rows.length);

        if (existingDesigs.rows.length === 0) {
            const designations = [
                { title: 'Chairman', department: 'board and executive management', min_salary: 150000, max_salary: 500000 },
                { title: 'Managing Director / CEO', department: 'board and executive management', min_salary: 200000, max_salary: 500000 },
                { title: 'Deputy CEO / COO', department: 'board and executive management', min_salary: 150000, max_salary: 400000 },
                { title: 'Credit Officer / Loan Officer', department: 'credit/lending', min_salary: 40000, max_salary: 100000 },
                { title: 'Cashier', department: 'finance and accounting', min_salary: 30000, max_salary: 60000 },
                { title: 'Accountant', department: 'finance and accounting', min_salary: 50000, max_salary: 120000 },
                { title: 'Software Engineer', department: 'it', min_salary: 60000, max_salary: 200000 },
                { title: 'HR Manager', department: 'human resources', min_salary: 60000, max_salary: 150000 },
                { title: 'HR Executive', department: 'human resources', min_salary: 35000, max_salary: 80000 },
                { title: 'Operations Manager', department: 'operations', min_salary: 60000, max_salary: 150000 },
                { title: 'Marketing Executive', department: 'marketing', min_salary: 40000, max_salary: 90000 },
                { title: 'Customer Service Representative', department: 'customer service', min_salary: 30000, max_salary: 60000 },
            ];

            for (const desig of designations) {
                const deptId = deptMap[desig.department];
                if (!deptId) {
                    console.log('  Skipping designation (no dept):', desig.title, '- dept:', desig.department);
                    continue;
                }
                try {
                    const result = await db.query(
                        'INSERT INTO designations (title, department_id, min_salary, max_salary) VALUES ($1, $2, $3, $4) RETURNING *',
                        [desig.title, deptId, desig.min_salary, desig.max_salary]
                    );
                    console.log('  Created designation:', result.rows[0].title, '(ID:', result.rows[0].id + ')');
                } catch (e) {
                    if (e.code === '23505') {
                        console.log('  Designation already exists:', desig.title);
                    } else {
                        console.error('  Error creating designation:', desig.title, e.message);
                    }
                }
            }
        }

        // Final counts
        const finalDepts = await db.query('SELECT COUNT(*) FROM departments');
        const finalDesigs = await db.query('SELECT COUNT(*) FROM designations');
        const finalLeaves = await db.query('SELECT COUNT(*) FROM leave_types');
        console.log('\n--- Final Counts ---');
        console.log('Departments:', finalDepts.rows[0].count);
        console.log('Designations:', finalDesigs.rows[0].count);
        console.log('Leave Types:', finalLeaves.rows[0].count);
        console.log('\nDone! The Structure & Protocols page should now show data.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

seedOrgData();
