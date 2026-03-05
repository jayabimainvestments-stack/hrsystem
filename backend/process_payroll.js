const db = require('./config/db');

async function processPayrollForAll() {
    // Use YYYY-MM format
    const month = '2026-02';
    const year = 2026;

    try {
        const empsRes = await db.query(`
            SELECT e.*, u.name, u.id as uid 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            ORDER BY e.id
        `);

        console.log(`Processing payroll for ${empsRes.rows.length} employees - ${month} ${year}\n`);

        for (const employee of empsRes.rows) {
            const user_id = employee.uid;
            console.log(`--- ${employee.name} (user_id: ${user_id}) ---`);

            // Check for duplicates
            const dupCheck = await db.query('SELECT id FROM payroll WHERE user_id = $1 AND month = $2', [user_id, month]);
            if (dupCheck.rows.length > 0) {
                console.log('  Already processed, skipping\n');
                continue;
            }

            // Fetch salary components
            const structRes = await db.query(`
                SELECT es.amount, sc.name, sc.type, sc.is_taxable, sc.epf_eligible, sc.etf_eligible, sc.welfare_eligible
                FROM employee_salary_structure es
                JOIN salary_components sc ON es.component_id = sc.id
                WHERE es.employee_id = $1
            `, [employee.id]);

            if (structRes.rows.length === 0) {
                console.log('  No salary structure, skipping\n');
                continue;
            }

            let basicSalary = 0, totalEarnings = 0, epfBase = 0, etfBase = 0, welfareBase = 0;
            let breakdown = [];

            for (const comp of structRes.rows) {
                const amount = parseFloat(comp.amount);
                if (comp.name.toLowerCase().includes('basic')) basicSalary = amount;
                if (comp.type === 'Earning') {
                    totalEarnings += amount;
                    if (comp.epf_eligible) epfBase += amount;
                    if (comp.etf_eligible) etfBase += amount;
                    if (comp.welfare_eligible) welfareBase += amount;
                    breakdown.push({ name: comp.name, amount, type: 'Earning' });
                } else if (comp.type === 'Deduction') {
                    breakdown.push({ name: comp.name, amount, type: 'Deduction' });
                }
            }

            // Welfare 2%
            const welfareAmount = welfareBase * 0.02;
            if (welfareAmount > 0) {
                breakdown.push({ name: 'Welfare', amount: welfareAmount, type: 'Deduction' });
            }

            // EPF/ETF
            const epf_employee = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
            const epf_employer = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.12) : 0;
            const etf_employer = (employee.is_etf_eligible && etfBase > 0) ? (etfBase * 0.03) : 0;

            if (epf_employee > 0) {
                breakdown.push({ name: 'EPF (Employee 8%)', amount: epf_employee, type: 'Statutory' });
            }

            const total_statutory = breakdown.filter(i => i.type === 'Statutory').reduce((sum, i) => sum + i.amount, 0);
            const total_deductions_val = breakdown.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + i.amount, 0);
            const total_deductions = total_statutory + total_deductions_val;
            const net_salary = totalEarnings - total_deductions;

            console.log(`  Gross: ${totalEarnings}, EPF emp: ${epf_employee}, EPF co: ${epf_employer}, ETF: ${etf_employer}, Welfare: ${welfareAmount}, Net: ${net_salary}`);

            // net_salary is a GENERATED column, so exclude it from INSERT
            // bonuses column = allowances (totalEarnings - basicSalary)
            const payrollRes = await db.query(
                `INSERT INTO payroll 
                (user_id, month, basic_salary, bonuses, deductions, epf_employee, epf_employer, etf_employer, welfare, welfare_status, statutory_status, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending', 'Pending', 'Internal') 
                RETURNING id, net_salary`,
                [user_id, month, basicSalary, totalEarnings - basicSalary, total_deductions, epf_employee, epf_employer, etf_employer, welfareAmount]
            );
            const payrollId = payrollRes.rows[0].id;

            // Save breakdown details
            for (const item of breakdown) {
                await db.query(
                    'INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)',
                    [payrollId, item.name, item.amount, item.type]
                );
            }

            // Update liabilities - store each component separately
            if (epf_employee > 0) await upsertLiability(month, 'EPF 8%', epf_employee);
            if (epf_employer > 0) await upsertLiability(month, 'EPF 12%', epf_employer);
            if (etf_employer > 0) await upsertLiability(month, 'ETF 3%', etf_employer);
            if (welfareAmount > 0) await upsertLiability(month, 'Welfare 2%', welfareAmount);

            console.log(`  ✓ Payroll #${payrollId} created (DB Net: ${payrollRes.rows[0].net_salary})\n`);
        }

        // Final summary
        console.log('\n=== PAYROLL RECORDS ===');
        const payrolls = await db.query(`
            SELECT p.id, u.name, p.month, p.basic_salary, p.net_salary, 
                   p.epf_employee, p.epf_employer, p.etf_employer, p.welfare
            FROM payroll p JOIN users u ON p.user_id = u.id ORDER BY p.id
        `);
        for (const p of payrolls.rows) {
            const n = p.name.substring(0, 30).padEnd(30);
            console.log(`  #${p.id} ${n} | Net: ${Number(p.net_salary).toLocaleString().padStart(10)} | EPF emp: ${Number(p.epf_employee).toLocaleString().padStart(6)} | EPF co: ${Number(p.epf_employer).toLocaleString().padStart(6)} | ETF: ${Number(p.etf_employer).toLocaleString().padStart(5)} | Welfare: ${Number(p.welfare).toLocaleString()}`);
        }

        console.log('\n=== STATUTORY LIABILITIES (EPF/ETF/Welfare) ===');
        const liabs = await db.query('SELECT * FROM payroll_liabilities ORDER BY id');
        for (const l of liabs.rows) {
            console.log(`  ${l.month.padEnd(10)} | ${l.type.padEnd(8)} | LKR ${Number(l.total_payable).toLocaleString().padStart(10)} | ${l.status}`);
        }

        console.log('\n✅ Done! EPF, ETF, and Welfare credits are now available on the Payroll page.');

    } catch (error) {
        console.error('Error:', error.message, error.stack);
    } finally {
        process.exit();
    }
}

async function upsertLiability(month, type, amount) {
    const check = await db.query('SELECT id FROM payroll_liabilities WHERE month = $1 AND type = $2', [month, type]);
    if (check.rows.length > 0) {
        await db.query('UPDATE payroll_liabilities SET total_payable = total_payable + $1 WHERE month = $2 AND type = $3', [amount, month, type]);
    } else {
        await db.query('INSERT INTO payroll_liabilities (month, type, total_payable, paid_amount, status) VALUES ($1, $2, $3, 0, $4)', [month, type, amount, 'Pending']);
    }
}

processPayrollForAll();
