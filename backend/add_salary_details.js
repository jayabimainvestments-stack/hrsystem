const db = require('./config/db');

async function addPayrollDetails() {
    try {
        console.log('=== STEP 1: Add missing salary components ===');

        // Components from the spreadsheet that are missing
        const newComponents = [
            { name: 'Annual Performance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Monthly Performance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Travelling', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Monthly Fuel', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Motorcycle Maintenance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
        ];

        for (const comp of newComponents) {
            try {
                const r = await db.query(
                    `INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, default_value, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 0, 'Active') RETURNING id`,
                    [comp.name, comp.type, comp.is_taxable, comp.epf, comp.etf, comp.welfare]
                );
                console.log(`  Created: ${comp.name} (ID: ${r.rows[0].id})`);
            } catch (e) {
                if (e.code === '23505') console.log(`  Exists: ${comp.name}`);
                else console.log(`  Error: ${comp.name} - ${e.message}`);
            }
        }

        // Get all component IDs
        const comps = await db.query('SELECT id, name FROM salary_components ORDER BY id');
        const compMap = {};
        comps.rows.forEach(c => { compMap[c.name] = c.id; });
        console.log('\nComponent IDs:', JSON.stringify(compMap, null, 2));

        console.log('\n=== STEP 2: Update EPF numbers & bank details ===');

        // Employee details from the spreadsheet:
        // EPF#1: D M K M DISSANAYAKE - NIC: 8012853921V, A/C: 79843382
        // EPF#2: L G D H LIYANAGE - NIC: 911851210V, A/C: 8105962
        // EPF#3: H A U K SENEVIRATHNA - NIC: 835723364V, A/C: 84853341
        // EPF#4: N L W NISHSHANKA - NIC: 200010080857, A/C: 87363507
        // EPF#5: R M P G HERATH - NIC: 995420800V, A/C: 88727415
        // EPF#6: S W K K A P P BANDARA - NIC: 980362710V, A/C: 88719704

        const empUpdates = [
            { emp_id: 2, epf_no: 'EPF-001', bank: { bank: 'Bank', branch: 'Dambulla', account: '79843382' } },
            { emp_id: 3, epf_no: 'EPF-002', bank: { bank: 'Bank', branch: 'Dambulla', account: '8105962' } },
            { emp_id: 4, epf_no: 'EPF-003', bank: { bank: 'Bank', branch: 'Dambulla', account: '84853341' } },
            { emp_id: 5, epf_no: 'EPF-004', bank: { bank: 'Bank', branch: 'Dambulla', account: '87363507' } },
            { emp_id: 6, epf_no: 'EPF-005', bank: { bank: 'Bank', branch: 'Dambulla', account: '88727415' } },
            { emp_id: 7, epf_no: 'EPF-006', bank: { bank: 'Bank', branch: 'Dambulla', account: '88719704' } },
        ];

        for (const u of empUpdates) {
            await db.query(
                'UPDATE employees SET epf_no = $1, bank_details = $2 WHERE id = $3',
                [u.epf_no, JSON.stringify(u.bank), u.emp_id]
            );
            console.log(`  Updated emp ${u.emp_id}: EPF=${u.epf_no}, A/C=${u.bank.account}`);
        }

        console.log('\n=== STEP 3: Add salary structures (Jan 2025 data) ===');

        // Clear existing structures
        await db.query('DELETE FROM employee_salary_structure');

        // Data from spreadsheet - January 2025
        // Mapping: employee_id => { component_name: amount }
        const salaryData = [
            {
                emp_id: 2, // D M K M DISSANAYAKE (Chairman) - EPF: NO, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 68500,
                    'Travelling': 85000,
                }
                // Base (EPF/ETF/Welfare): 30000
                // Gross: 183500, Welfare: 600, Net: 182900
                // EPF emp: 0, EPF employer: 0, ETF: 900
            },
            {
                emp_id: 3, // L G D H LIYANAGE (MD/CEO) - EPF: NO, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 34000,
                    'Travelling': 65500,
                }
                // Base: 30000
                // Gross: 129500, Welfare: 600, Net: 128900 (approx)
            },
            {
                emp_id: 4, // H A U K SENEVIRATHNA (Deputy CEO/COO) - EPF: NO, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 38500,
                }
                // Base: 30000
                // Gross: 68500, Welfare: 600, Net: 67900
            },
            {
                emp_id: 5, // N L W NISHSHANKA (Credit Officer) - EPF: YES, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 25450,
                    'Monthly Performance': 2000,
                    'Travelling': 9000,
                    'Monthly Fuel': 19825,
                    'Motorcycle Maintenance': 10000,
                }
                // Base: 30000
                // EPF 8%: 2400, Welfare: 600
                // Staff Loan: 15000
            },
            {
                emp_id: 6, // R M P G HERATH (Cashier) - EPF: YES, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 13450,
                    'Monthly Performance': 13000,
                    'Travelling': 7000,
                }
                // Base: 30000
                // EPF 8%: 2400, Welfare: 600
            },
            {
                emp_id: 7, // S W K K A P P BANDARA (Credit Officer) - EPF: YES, ETF: YES
                components: {
                    'Basic Salary': 26500,
                    'Budgetary Allowance 1': 1000,
                    'Budgetary Allowance 2': 2500,
                    'Annual Performance': 25450,
                    'Monthly Performance': 6000,
                    'Travelling': 9000,
                    'Monthly Fuel': 19825,
                    'Motorcycle Maintenance': 7000,
                }
                // Base: 30000
                // EPF 8%: 2400, Welfare: 600
            },
        ];

        for (const emp of salaryData) {
            let totalGross = 0;
            for (const [compName, amount] of Object.entries(emp.components)) {
                const compId = compMap[compName];
                if (!compId) {
                    console.log(`  ⚠ Component not found: ${compName}`);
                    continue;
                }
                await db.query(
                    'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)',
                    [emp.emp_id, compId, amount]
                );
                totalGross += amount;
            }
            console.log(`  ✓ Emp ${emp.emp_id}: ${Object.keys(emp.components).length} components, Gross = LKR ${totalGross.toLocaleString()}`);
        }

        // Verify
        console.log('\n=== VERIFICATION ===');
        const verify = await db.query(`
            SELECT e.id, u.name, 
                   SUM(es.amount) as total_gross,
                   COUNT(es.id) as num_components,
                   e.is_epf_eligible, e.is_etf_eligible, e.epf_no
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN employee_salary_structure es ON es.employee_id = e.id
            GROUP BY e.id, u.name, e.is_epf_eligible, e.is_etf_eligible, e.epf_no
            ORDER BY e.id
        `);

        console.log('\n  Employee                    | Gross       | Components | EPF | ETF | EPF#');
        console.log('  ' + '-'.repeat(85));
        for (const r of verify.rows) {
            const name = r.name.substring(0, 30).padEnd(30);
            const gross = ('LKR ' + Number(r.total_gross).toLocaleString()).padEnd(12);
            console.log(`  ${name}| ${gross}| ${r.num_components}          | ${r.is_epf_eligible ? 'YES' : 'NO '}  | ${r.is_etf_eligible ? 'YES' : 'NO '}  | ${r.epf_no || '-'}`);
        }

        console.log('\n✅ All salary details added successfully!');

    } catch (error) {
        console.error('Error:', error.message, error.stack);
    } finally {
        process.exit();
    }
}

addPayrollDetails();
