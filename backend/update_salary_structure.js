const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const updateStructure = async () => {
    try {
        const dataPath = path.join(__dirname, 'payroll_data.json');
        if (!fs.existsSync(dataPath)) {
            console.error('payroll_data.json not found!');
            process.exit(1);
        }

        const payrollData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`Loaded ${payrollData.length} records.`);

        // 1. Ensure "Basic Salary" component exists
        await db.query(`
            INSERT INTO salary_components (name, type, is_taxable) 
            VALUES ('Basic Salary', 'Earning', true)
            ON CONFLICT (name) DO NOTHING
        `);

        for (const record of payrollData) {
            // Find Employee ID
            const empRes = await db.query("SELECT id FROM employees WHERE nic_passport = $1", [record.nic]);

            if (empRes.rows.length === 0) {
                console.error(`Employee with NIC ${record.nic} not found. Skipping.`);
                continue;
            }

            const employeeId = empRes.rows[0].id;

            // 2. Update Bank Account
            if (record.account_no) {
                await db.query("UPDATE employees SET bank_account_no = $1 WHERE id = $2", [record.account_no, employeeId]);
                console.log(`Updated bank account for NIC ${record.nic}`);
            }

            // 3. Process Components
            // Clear existing structure for this employee to re-sync
            await db.query('DELETE FROM employee_salary_structure WHERE employee_id = $1', [employeeId]);

            // A. Basic Salary
            const basicCompRes = await db.query("SELECT id FROM salary_components WHERE name = 'Basic Salary'");
            const basicCompId = basicCompRes.rows[0].id;

            await db.query(`
                INSERT INTO employee_salary_structure (employee_id, component_id, amount)
                VALUES ($1, $2, $3)
            `, [employeeId, basicCompId, record.basic_salary]);

            // B. Allowances
            for (const item of record.allowances) {
                // Ensure component exists
                await db.query(`
                    INSERT INTO salary_components (name, type, is_taxable) 
                    VALUES ($1, 'Earning', true)
                    ON CONFLICT (name) DO NOTHING
                `, [item.name]);

                const compRes = await db.query("SELECT id FROM salary_components WHERE name = $1", [item.name]);
                const compId = compRes.rows[0].id;

                await db.query(`
                    INSERT INTO employee_salary_structure (employee_id, component_id, amount)
                    VALUES ($1, $2, $3)
                `, [employeeId, compId, item.amount]);
            }

            // C. Deductions
            for (const item of record.deductions) {
                // Skip manual EPF/BPF or Welfare if it's already handled by the system
                if (item.name.includes('BPF') || item.name.includes('EPF') || item.name === 'Welfare') {
                    console.log(`Skipping handled deduction ${item.name} for NIC ${record.nic} as it is auto-handled by the payroll engine.`);
                    continue;
                }

                // Ensure component exists
                await db.query(`
                    INSERT INTO salary_components (name, type, is_taxable) 
                    VALUES ($1, 'Deduction', false)
                    ON CONFLICT (name) DO NOTHING
                `, [item.name]);

                const compRes = await db.query("SELECT id FROM salary_components WHERE name = $1", [item.name]);
                const compId = compRes.rows[0].id;

                await db.query(`
                    INSERT INTO employee_salary_structure (employee_id, component_id, amount)
                    VALUES ($1, $2, $3)
                `, [employeeId, compId, item.amount]);
            }

            console.log(`Updated salary structure for NIC ${record.nic}`);
        }

        console.log('Structure update completed.');
        process.exit();

    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
};

updateStructure();
