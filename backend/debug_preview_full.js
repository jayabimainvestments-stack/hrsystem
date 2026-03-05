const db = require('./config/db');

// Mock calculateTax since it's in the same file normally
const calculateTax = (taxableIncome, brackets) => {
    if (taxableIncome <= 0 || !brackets || brackets.length === 0) return 0;
    let tax = 0;
    for (const bracket of brackets) {
        if (taxableIncome > bracket.min_income) {
            const applicableAmount = Math.min(taxableIncome, bracket.max_income || Infinity) - bracket.min_income;
            tax += applicableAmount * (bracket.tax_rate / 100);
        }
    }
    return tax;
};

async function testFullPreview() {
    const user_id = 16; // Krishantha
    const month = 'February';
    const year = 2026;
    const processingYear = year;
    const monthMap = { 'February': '02' };
    const monthNum = monthMap[month];
    const datePrefix = `${processingYear}-${monthNum}`;

    try {
        const empRes = await db.query(`SELECT e.*, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1`, [user_id]);
        const employee = empRes.rows[0];

        const [policyRes, taxRes, structRes, appraisalRes, perfApprovalRes] = await Promise.all([
            db.query('SELECT * FROM attendance_policies WHERE id = 1'),
            db.query('SELECT * FROM tax_brackets ORDER BY min_income ASC'),
            db.query(`
                SELECT es.amount, es.quantity, sc.name, sc.type, sc.is_taxable, sc.epf_eligible, sc.etf_eligible, sc.welfare_eligible,
                       es.installments_remaining, es.component_id, es.is_locked
                FROM employee_salary_structure es
                JOIN salary_components sc ON es.component_id = sc.id
                WHERE es.employee_id = $1
            `, [employee.id]),
            db.query(`SELECT overall_score FROM performance_appraisals WHERE employee_id = $1 AND status = 'Approved' ORDER BY created_at DESC LIMIT 1`, [employee.id]),
            db.query(`SELECT total_amount FROM performance_monthly_approvals WHERE employee_id = $1 AND month = $2 AND status = 'Approved'`, [employee.id, datePrefix])
        ]);

        const policy = policyRes.rows[0];
        const taxBrackets = taxRes.rows;
        const components = structRes.rows;
        const perfScore = appraisalRes.rows.length > 0 ? parseFloat(appraisalRes.rows[0].overall_score) : 5;
        const approvedPerfAmount = perfApprovalRes.rows.length > 0 ? parseFloat(perfApprovalRes.rows[0].total_amount) : null;

        const overrideRes = await db.query(`SELECT component_id, amount, quantity, reason FROM monthly_salary_overrides WHERE employee_id = $1 AND month = $2`, [employee.id, datePrefix]);
        const monthlyOverrides = overrideRes.rows;
        const overrideMap = new Map(monthlyOverrides.map(o => [o.component_id, o]));
        const processedOverrideIds = new Set();

        let basicSalary = 0;
        let totalEarnings = 0;
        let totalTaxable = 0;
        let epfBase = 0;
        let breakdown = [];

        for (const comp of components) {
            let amount = parseFloat(comp.amount);
            const compName = comp.name.toLowerCase();

            if (overrideMap.has(comp.component_id)) {
                const override = overrideMap.get(comp.component_id);
                amount = parseFloat(override.amount);
                processedOverrideIds.add(comp.component_id);
            }

            if (compName.includes('basic')) basicSalary = amount;

            if (comp.type === 'Earning') {
                totalEarnings += amount;
                if (comp.is_taxable) totalTaxable += amount;
                if (comp.epf_eligible) epfBase += amount;
                breakdown.push({ name: comp.name, amount, type: 'Earning' });
            } else if (comp.type === 'Deduction') {
                breakdown.push({ name: comp.name, amount, type: 'Deduction' });
            }
        }

        for (const override of monthlyOverrides) {
            if (!processedOverrideIds.has(override.component_id)) {
                const compInfoRes = await db.query('SELECT name, type, is_taxable, epf_eligible FROM salary_components WHERE id = $1', [override.component_id]);
                if (compInfoRes.rows.length > 0) {
                    const compInfo = compInfoRes.rows[0];
                    const amount = parseFloat(override.amount);
                    if (compInfo.type === 'Earning') {
                        totalEarnings += amount;
                        if (compInfo.is_taxable) totalTaxable += amount;
                        if (compInfo.epf_eligible) epfBase += amount;
                        breakdown.push({ name: compInfo.name, amount, type: 'Earning' });
                    } else if (compInfo.type === 'Deduction') {
                        breakdown.push({ name: compInfo.name, amount, type: 'Deduction' });
                    }
                }
            }
        }

        const epf_employee = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
        if (epf_employee > 0) breakdown.push({ name: 'EPF (8%)', amount: epf_employee, type: 'Deduction' });

        const incomeTax = calculateTax(totalTaxable - epf_employee, taxBrackets);
        if (incomeTax > 0) breakdown.push({ name: 'Income Tax (PAYE)', amount: incomeTax, type: 'Deduction' });

        const totalDeductions = breakdown.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + i.amount, 0);

        console.log({
            net_salary: totalEarnings - totalDeductions,
            breakdown: breakdown.map(b => `${b.type}: ${b.name} = ${b.amount}`)
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testFullPreview();
