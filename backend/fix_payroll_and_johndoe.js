const db = require('./config/db');

async function fixPayrollAndRemoveJohnDoe() {
    try {
        console.log('========================================');
        console.log('  STEP 1: Remove John Doe');
        console.log('========================================');

        // John Doe: user_id=2, employee_id=1
        const johnUserId = 2;
        const johnEmpId = 1;

        // Delete from all related tables first (child records)
        const deleteTables = [
            { table: 'attendance', col: 'employee_id', id: johnEmpId },
            { table: 'employee_salary_structure', col: 'employee_id', id: johnEmpId },
            { table: 'onboarding_tasks', col: 'employee_id', id: johnEmpId },
            { table: 'leaves', col: 'user_id', id: johnUserId },
            { table: 'leave_balances', col: 'user_id', id: johnUserId },
            { table: 'documents', col: 'user_id', id: johnUserId },
            { table: 'payroll', col: 'user_id', id: johnUserId },
            { table: 'resignations', col: 'user_id', id: johnUserId },
            { table: 'performance_appraisals', col: 'employee_id', id: johnEmpId },
            { table: 'audit_logs', col: 'user_id', id: johnUserId },
        ];

        for (const { table, col, id } of deleteTables) {
            try {
                const result = await db.query(`DELETE FROM ${table} WHERE ${col} = $1`, [id]);
                if (result.rowCount > 0) {
                    console.log(`  ✓ Deleted ${result.rowCount} record(s) from ${table}`);
                }
            } catch (e) {
                // Ignore if table/column doesn't exist
            }
        }

        // Delete employee record
        try {
            await db.query('DELETE FROM employees WHERE id = $1', [johnEmpId]);
            console.log('  ✓ Deleted employee record (id=1)');
        } catch (e) {
            console.log('  ! Employee delete error:', e.message);
        }

        // Delete user record
        try {
            await db.query('DELETE FROM users WHERE id = $1', [johnUserId]);
            console.log('  ✓ Deleted user record (id=2, John Doe)');
        } catch (e) {
            console.log('  ! User delete error:', e.message);
        }

        console.log('\n========================================');
        console.log('  STEP 2: Setup Salary Components');
        console.log('========================================');

        // Check salary_components schema first - need to check if epf/etf/welfare columns exist
        const scCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'salary_components'");
        const colNames = scCols.rows.map(r => r.column_name);
        console.log('  Current salary_components columns:', colNames.join(', '));

        // Add missing columns if needed
        if (!colNames.includes('epf_eligible')) {
            await db.query('ALTER TABLE salary_components ADD COLUMN IF NOT EXISTS epf_eligible BOOLEAN DEFAULT FALSE');
            console.log('  ✓ Added epf_eligible column');
        }
        if (!colNames.includes('etf_eligible')) {
            await db.query('ALTER TABLE salary_components ADD COLUMN IF NOT EXISTS etf_eligible BOOLEAN DEFAULT FALSE');
            console.log('  ✓ Added etf_eligible column');
        }
        if (!colNames.includes('welfare_eligible')) {
            await db.query('ALTER TABLE salary_components ADD COLUMN IF NOT EXISTS welfare_eligible BOOLEAN DEFAULT FALSE');
            console.log('  ✓ Added welfare_eligible column');
        }
        if (!colNames.includes('default_value')) {
            await db.query('ALTER TABLE salary_components ADD COLUMN IF NOT EXISTS default_value NUMERIC DEFAULT 0');
            console.log('  ✓ Added default_value column');
        }

        // Clear and recreate salary components
        const existingComponents = await db.query('SELECT COUNT(*) FROM salary_components');
        if (parseInt(existingComponents.rows[0].count) === 0) {
            const components = [
                // Earnings
                { name: 'Basic Salary', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: true, default_value: 0 },
                { name: 'Budgetary Allowance 1', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: true, default_value: 0 },
                { name: 'Budgetary Allowance 2', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: true, default_value: 0 },
                { name: 'Transport Allowance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false, default_value: 0 },
                { name: 'Meal Allowance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false, default_value: 0 },
                { name: 'Performance Bonus', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false, default_value: 0 },
                { name: 'Overtime', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false, default_value: 0 },
                // Deductions
                { name: 'Salary Advance', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false, default_value: 0 },
                { name: 'Loan Deduction', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false, default_value: 0 },
            ];

            for (const comp of components) {
                try {
                    const result = await db.query(
                        `INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, default_value, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active') RETURNING id`,
                        [comp.name, comp.type, comp.is_taxable, comp.epf, comp.etf, comp.welfare, comp.default_value]
                    );
                    console.log(`  ✓ Created component: ${comp.name} (ID: ${result.rows[0].id})`);
                } catch (e) {
                    if (e.code === '23505') {
                        console.log(`  - Component already exists: ${comp.name}`);
                    } else {
                        console.log(`  ! Error creating ${comp.name}:`, e.message);
                    }
                }
            }
        } else {
            console.log(`  Salary components already exist (${existingComponents.rows[0].count} records)`);
        }

        // Verify final state
        console.log('\n========================================');
        console.log('  VERIFICATION');
        console.log('========================================');

        const users = await db.query('SELECT id, name, email, role FROM users ORDER BY id');
        console.log('\nUsers:');
        users.rows.forEach(u => console.log(`  [${u.id}] ${u.name} (${u.email}) - ${u.role}`));

        const emps = await db.query('SELECT e.id, u.name, e.department, e.designation, e.user_id FROM employees e JOIN users u ON e.user_id = u.id ORDER BY e.id');
        console.log('\nEmployees:');
        emps.rows.forEach(e => console.log(`  [${e.id}] ${e.name} - ${e.department} / ${e.designation} (user_id: ${e.user_id})`));

        const comps = await db.query('SELECT id, name, type, epf_eligible, etf_eligible, welfare_eligible FROM salary_components ORDER BY id');
        console.log('\nSalary Components:');
        comps.rows.forEach(c => console.log(`  [${c.id}] ${c.name} (${c.type}) EPF:${c.epf_eligible} ETF:${c.etf_eligible} Welfare:${c.welfare_eligible}`));

        console.log('\n✅ Done! John Doe removed and salary components set up.');
        console.log('ℹ️  Next: Go to Payroll Settings page to assign salary structures to each employee.');

    } catch (error) {
        console.error('Fatal error:', error.message);
    } finally {
        process.exit();
    }
}

fixPayrollAndRemoveJohnDoe();
