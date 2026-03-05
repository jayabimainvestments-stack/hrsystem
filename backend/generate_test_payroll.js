const db = require('./config/db');

async function testPayroll() {
    const userId = 16; // Krishantha
    const month = '2026-02';

    console.log(`\n--- 🧪 TEST PAYROLL GENERATION: KRISHANTHA (${month}) ---`);

    try {
        // 1. Fetch Catalog
        const catalogRes = await db.query("SELECT id, name, type FROM salary_components WHERE status = 'Active'");
        const catalog = catalogRes.rows;

        // Identify standard components
        const findComp = (s) => catalog.find(c => c.name.toLowerCase().includes(s.toLowerCase()));
        const compEpf8 = findComp('epf 8%');
        const compAdvance = findComp('advance');

        // 2. Get Employee
        const empRes = await db.query(`
            SELECT e.id, u.name, e.is_epf_eligible 
            FROM employees e JOIN users u ON e.user_id = u.id 
            WHERE u.id = $1`, [userId]);
        const employee = empRes.rows[0];

        // 3. Get Structure
        const structRes = await db.query(`
            SELECT sc.name, es.amount, sc.type, sc.epf_eligible, es.component_id
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1`, [employee.id]);

        // 4. Get Overrides
        const overrideRes = await db.query(`
            SELECT component_id, amount, reason 
            FROM monthly_salary_overrides 
            WHERE employee_id = $1 AND month = $2`, [employee.id, month]);

        const overrideMap = new Map(overrideRes.rows.map(o => [o.component_id, o]));
        const processedOverrideIds = new Set();

        let totalEarnings = 0;
        let totalDeductions = 0;
        let epfBase = 0;
        let etfBase = 0;
        let welfareBase = 0;
        const breakdown = [];

        // Process Structure & Overrides
        for (const item of structRes.rows) {
            let amount = parseFloat(item.amount);
            let name = item.name;

            if (overrideMap.has(item.component_id)) {
                amount = parseFloat(overrideMap.get(item.component_id).amount);
                name += " (Override)";
                processedOverrideIds.add(item.component_id);
            }

            if (item.type === 'Earning') {
                totalEarnings += amount;
                if (item.epf_eligible) {
                    epfBase += amount;
                    etfBase += amount;
                    welfareBase += amount;
                }
            } else {
                totalDeductions += amount;
            }

            breakdown.push({ name, amount, type: item.type });
        }

        // Remaining Overrides (The Salary Advance is here)
        for (const override of overrideRes.rows) {
            if (!processedOverrideIds.has(override.component_id)) {
                const compInfo = catalog.find(c => c.id === override.component_id);
                const amount = parseFloat(override.amount);
                const name = compInfo ? compInfo.name : `Component ${override.component_id}`;

                if (compInfo && compInfo.type === 'Earning') {
                    totalEarnings += amount;
                } else {
                    totalDeductions += amount;
                }
                breakdown.push({ name, amount, type: compInfo ? compInfo.type : 'Deduction', details: override.reason });
            }
        }

        // Statutory & Welfare logic
        let epf_employee = 0;
        let etf_employer = 0;
        let welfare_amount = 0;

        if (employee.is_epf_eligible && epfBase > 0) {
            epf_employee = epfBase * 0.08;
            totalDeductions += epf_employee;
            breakdown.push({ name: compEpf8 ? compEpf8.name : 'EPF 8%', amount: epf_employee, type: 'Statutory' });
        }

        if (employee.is_etf_eligible && etfBase > 0) {
            etf_employer = etfBase * 0.03;
            // ETF is employer only, so it's not a deduction from employee, 
            // but we track it for liability. Usually breakdown for payslip hide it.
        }

        if (welfareBase > 0) {
            welfare_amount = welfareBase * 0.02;
            totalDeductions += welfare_amount;
            breakdown.push({ name: 'Welfare 2%', amount: welfare_amount, type: 'Deduction' });
        }

        // PAYE (Simplified formula for test)
        const taxableIncome = totalEarnings - epf_employee;
        let paye = 0;
        if (taxableIncome > 100000) paye = (taxableIncome - 100000) * 0.06; // Mock bracket
        if (paye > 0) {
            totalDeductions += paye;
            breakdown.push({ name: 'Income Tax (PAYE)', amount: paye, type: 'Deduction' });
        }

        console.table(breakdown);
        console.log(`\n💰 SUMMARY:`);
        console.log(`Total Earnings:   LKR ${totalEarnings.toLocaleString()}`);
        console.log(`Total Deductions: LKR ${totalDeductions.toLocaleString()}`);
        console.log(`-----------------------------------`);
        console.log(`NET SALARY:       LKR ${(totalEarnings - totalDeductions).toLocaleString()}`);

        if (employee.is_etf_eligible) {
            console.log(`Employer ETF (3%): LKR ${etf_employer.toLocaleString()}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testPayroll();
