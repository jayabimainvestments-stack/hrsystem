const db = require('./config/db');

async function fixPayroll() {
    console.log('--- FIXING PAYROLL LOGIC & COMPONENTS ---');
    try {
        await db.query('BEGIN');

        // 1. Standardize Salary Components
        const components = [
            { name: 'Basic pay', type: 'Earning', epf: true, etf: true, welfare: true },
            { name: 'Budgetary Allowance 1', type: 'Earning', epf: true, etf: true, welfare: true },
            { name: 'Budgetary Allowance 2', type: 'Earning', epf: true, etf: true, welfare: true },
            { name: 'Travelling', type: 'Earning', epf: false, etf: false, welfare: false },
            { name: 'Monthly fuel', type: 'Earning', epf: false, etf: false, welfare: false },
            { name: 'Annual Performance', type: 'Earning', epf: false, etf: false, welfare: false },
            { name: 'Monthly Performance', type: 'Earning', epf: false, etf: false, welfare: false },
            { name: 'Attendance Allowance', type: 'Earning', epf: false, etf: false, welfare: false }
        ];

        for (const c of components) {
            const check = await db.query('SELECT id FROM salary_components WHERE name = $1', [c.name]);
            if (check.rows.length > 0) {
                console.log(`Updating component: ${c.name}`);
                await db.query(`
                    UPDATE salary_components 
                    SET epf_eligible = $1, etf_eligible = $2, welfare_eligible = $3, status = 'Active', type = $5
                    WHERE id = $4
                `, [c.epf, c.etf, c.welfare, check.rows[0].id, c.type]);
            } else {
                console.log(`Creating component: ${c.name}`);
                await db.query(`
                    INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, status)
                    VALUES ($1, $2, true, $3, $4, $5, 'Active')
                `, [c.name, c.type, c.epf, c.etf, c.welfare]);
            }
        }

        // 2. Enable EPF/ETF for all active employees
        console.log('Enabling EPF/ETF for active employees...');
        await db.query("UPDATE employees SET is_epf_eligible = true, is_etf_eligible = true");

        // 3. Clean up Salary Structures
        console.log('Removing manual EPF/ETF from salary structures...');
        const epfComp = await db.query("SELECT id FROM salary_components WHERE name ILIKE '%E.P.F.%' OR name ILIKE '%ETF%'");
        if (epfComp.rows.length > 0) {
            const ids = epfComp.rows.map(r => r.id);
            await db.query("DELETE FROM employee_salary_structure WHERE component_id = ANY($1)", [ids]);
        }

        // 4. Update Salaries (Based on backup data and user requirements)
        // User confirmed: Basic 30,000, Budg1 1,000, Budg2 2,500
        const emps = await db.query("SELECT id FROM employees");
        const b1 = await db.query("SELECT id FROM salary_components WHERE name = 'Budgetary Allowance 1'");
        const b2 = await db.query("SELECT id FROM salary_components WHERE name = 'Budgetary Allowance 2'");
        const basic = await db.query("SELECT id FROM salary_components WHERE name = 'Basic pay'");

        for (const emp of emps.rows) {
            // Ensure Basic is 30,000
            const hasBasic = await db.query("SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2", [emp.id, basic.rows[0].id]);
            if (hasBasic.rows.length > 0) {
                await db.query("UPDATE employee_salary_structure SET amount = 30000 WHERE id = $1", [hasBasic.rows[0].id]);
            } else {
                await db.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount, effective_date) VALUES ($1, $2, 30000, NOW())", [emp.id, basic.rows[0].id]);
            }

            // Ensure Budgetary 1 (1000)
            const hasB1 = await db.query("SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2", [emp.id, b1.rows[0].id]);
            if (hasB1.rows.length > 0) {
                await db.query("UPDATE employee_salary_structure SET amount = 1000 WHERE id = $1", [hasB1.rows[0].id]);
            } else {
                await db.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount, effective_date) VALUES ($1, $2, 1000, NOW())", [emp.id, b1.rows[0].id]);
            }

            // Ensure Budgetary 2 (2500)
            const hasB2 = await db.query("SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2", [emp.id, b2.rows[0].id]);
            if (hasB2.rows.length > 0) {
                await db.query("UPDATE employee_salary_structure SET amount = 2500 WHERE id = $1", [hasB2.rows[0].id]);
            } else {
                await db.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount, effective_date) VALUES ($1, $2, 2500, NOW())", [emp.id, b2.rows[0].id]);
            }

            console.log(`Updated structure for Employee ID: ${emp.id}`);
        }

        await db.query('COMMIT');
        console.log('✅ Payroll logic fixed successfully!');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error('❌ Error fixing payroll:', e);
    } finally {
        process.exit();
    }
}

fixPayroll();
