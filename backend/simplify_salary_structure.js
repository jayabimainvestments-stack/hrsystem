const db = require('./config/db');

async function simplifySalaries() {
    console.log('--- SIMPLIFYING SALARY STRUCTURE ---');
    try {
        await db.query('BEGIN');

        // 1. Find component IDs
        const b1Res = await db.query("SELECT id FROM salary_components WHERE name = 'Budgetary Allowance 1'");
        const b2Res = await db.query("SELECT id FROM salary_components WHERE name = 'Budgetary Allowance 2'");
        const basicRes = await db.query("SELECT id FROM salary_components WHERE name = 'Basic pay'");

        const b1Id = b1Res.rows[0]?.id;
        const b2Id = b2Res.rows[0]?.id;
        const basicId = basicRes.rows[0]?.id;

        if (!basicId) {
            throw new Error('Basic pay component not found');
        }

        // 2. Remove Budgetary Allowances from all employees
        if (b1Id || b2Id) {
            const idsToDelete = [b1Id, b2Id].filter(id => id !== undefined);
            console.log(`Removing components ${idsToDelete.join(', ')} from structures...`);
            await db.query("DELETE FROM employee_salary_structure WHERE component_id = ANY($1)", [idsToDelete]);
        }

        // 3. Ensure Basic Pay is 30,000 for all active employees
        const emps = await db.query("SELECT id FROM employees");
        for (const emp of emps.rows) {
            const checkBasic = await db.query(
                "SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2",
                [emp.id, basicId]
            );

            if (checkBasic.rows.length > 0) {
                console.log(`Updating Basic Pay to 30000 for Emp ID: ${emp.id}`);
                await db.query(
                    "UPDATE employee_salary_structure SET amount = 30000 WHERE id = $1",
                    [checkBasic.rows[0].id]
                );
            } else {
                console.log(`Inserting Basic Pay 30000 for Emp ID: ${emp.id}`);
                await db.query(
                    "INSERT INTO employee_salary_structure (employee_id, component_id, amount, effective_date) VALUES ($1, $2, 30000, NOW())",
                    [emp.id, basicId]
                );
            }
        }

        // 4. Ensure Salary Components flags are correct for Basic Pay
        console.log('Ensuring Basic Pay is EPF/ETF/Welfare eligible...');
        await db.query(
            "UPDATE salary_components SET epf_eligible = true, etf_eligible = true, welfare_eligible = true WHERE id = $1",
            [basicId]
        );

        // 5. De-activate Budgetary Allowance components (optional but clean)
        if (b1Id || b2Id) {
            const idsToDeactivate = [b1Id, b2Id].filter(id => id !== undefined);
            await db.query("UPDATE salary_components SET status = 'Inactive' WHERE id = ANY($1)", [idsToDeactivate]);
        }

        await db.query('COMMIT');
        console.log('✅ Salary structure simplified successfully!');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error('❌ Error simplifying salaries:', e);
    } finally {
        process.exit();
    }
}

simplifySalaries();
