const db = require('./config/db');

async function recomputeFeb() {
    try {
        const month = '2026-02';
        console.log(`--- Re-computation Audit for ${month} ---`);

        // 1. Get Employees
        const empRes = await db.query(`
            SELECT e.id as employee_id, u.id as user_id, u.name, e.is_epf_eligible, e.is_etf_eligible 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE e.employment_status = 'Active'
        `);
        const employees = empRes.rows;

        // 2. Get Approved Components for Feb
        const overridesRes = await db.query(`
            SELECT mo.employee_id, sc.name, sc.type, mo.amount, sc.epf_eligible, sc.welfare_eligible 
            FROM monthly_salary_overrides mo 
            JOIN salary_components sc ON mo.component_id = sc.id 
            WHERE mo.month = $1 AND mo.status = 'Approved'
        `, [month]);
        const overrides = overridesRes.rows;

        // 3. Get Payroll Records
        const payrollRes = await db.query(`SELECT * FROM payroll WHERE month = $1`, [month]);
        const payrollRecords = payrollRes.rows;

        for (const emp of employees) {
            console.log(`\nAuditing Employee: ${emp.name} (ID: ${emp.employee_id})`);

            const empOverrides = overrides.filter(o => o.employee_id === emp.employee_id);
            const payroll = payrollRecords.find(p => p.user_id === emp.user_id);

            if (!payroll) {
                console.log(`[!] No payroll record found for ${emp.name}`);
                continue;
            }

            let basicSalary = 0;
            let totalEarnings = 0;
            let epfBase = 0;
            let welfareBase = 0;
            let manualDeductions = 0;

            for (const comp of empOverrides) {
                const amt = parseFloat(comp.amount);
                if (comp.name.toLowerCase().includes('basic')) basicSalary = amt;

                if (comp.type === 'Earning') {
                    totalEarnings += amt;
                    if (comp.epf_eligible) epfBase += amt;
                    if (comp.welfare_eligible) welfareBase += amt;
                } else if (comp.type === 'Deduction') {
                    // Skip calculated deductions
                    if (!comp.name.toLowerCase().includes('epf') && !comp.name.toLowerCase().includes('welfare')) {
                        manualDeductions += amt;
                    }
                }
            }

            // Calculations based on Rule 5/6
            const epf8 = (emp.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
            const epf12 = (emp.is_epf_eligible && epfBase > 0) ? (epfBase * 0.12) : 0;
            const etf3 = (emp.is_etf_eligible && epfBase > 0) ? (epfBase * 0.03) : 0;
            const welfare = (welfareBase > 0) ? (welfareBase * 0.02) : 0;

            const totalDeductions = manualDeductions + epf8 + welfare;
            const netSalary = totalEarnings - totalDeductions;

            console.log(` - Re-computed Earnings: ${totalEarnings}`);
            console.log(` - Re-computed Deductions: ${totalDeductions} (Stat: ${epf8 + welfare}, Manual: ${manualDeductions})`);
            console.log(` - Re-computed Net: ${netSalary}`);
            console.log(` - DB Record Net: ${payroll.net_salary}`);

            const diff = Math.abs(netSalary - parseFloat(payroll.net_salary));
            if (diff > 0.01) {
                console.log(`[!!!] MISMATCH DETECTED: Diff = ${diff}`);
            } else {
                console.log(`[PASS] Accurate`);
            }

            // Log Statutory check
            if (Math.abs(epf8 - parseFloat(payroll.epf_employee)) > 0.01) console.log(`[!] EPF 8% Mismatch! DB: ${payroll.epf_employee}, Calc: ${epf8}`);
            if (Math.abs(epf12 - parseFloat(payroll.epf_employer)) > 0.01) console.log(`[!] EPF 12% Mismatch! DB: ${payroll.epf_employer}, Calc: ${epf12}`);
            if (Math.abs(etf3 - parseFloat(payroll.etf_employer)) > 0.01) console.log(`[!] ETF 3% Mismatch! DB: ${payroll.etf_employer}, Calc: ${etf3}`);
            if (Math.abs(welfare - parseFloat(payroll.welfare)) > 0.01) console.log(`[!] Welfare Mismatch! DB: ${payroll.welfare}, Calc: ${welfare}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

recomputeFeb();
