const db = require('./config/db');

async function runAudit() {
    try {
        console.log('--- Deep Payroll Audit: Baseline vs Monthly Overrides ---');
        const baselineRes = await db.query(`
            SELECT e.id as employee_id, u.name, ess.component_id, sc.name as component_name, ess.amount, ess.quantity 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            JOIN employee_salary_structure ess ON e.id = ess.employee_id 
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE e.employment_status = 'Active'
        `);
        const baseline = baselineRes.rows;

        const overridesRes = await db.query(`
            SELECT employee_id, component_id, amount, quantity, reason 
            FROM monthly_salary_overrides 
            WHERE month = '2026-02' AND status = 'Approved'
        `);
        const overrides = overridesRes.rows;

        const result = [];
        for (const emp of [...new Set(baseline.map(b => b.employee_id))]) {
            const empName = baseline.find(b => b.employee_id === emp).name;
            const empBaseline = baseline.filter(b => b.employee_id === emp);
            const empOverrides = overrides.filter(o => o.employee_id === emp);

            const comparison = {
                employee: empName,
                matched: [],
                mismatched: [],
                manual_overrides: []
            };

            for (const b of empBaseline) {
                const match = empOverrides.find(o => o.component_id === b.component_id && o.reason.includes('Baseline'));
                if (match) {
                    if (parseFloat(match.amount) === parseFloat(b.amount)) {
                        comparison.matched.push(b.component_name);
                    } else {
                        comparison.mismatched.push({
                            name: b.component_name,
                            base: b.amount,
                            override: match.amount
                        });
                    }
                } else {
                    comparison.mismatched.push({
                        name: b.component_name,
                        base: b.amount,
                        override: 'MISSING'
                    });
                }
            }

            for (const o of empOverrides) {
                if (!o.reason.includes('Baseline')) {
                    const compNameRes = await db.query('SELECT name FROM salary_components WHERE id = $1', [o.component_id]);
                    comparison.manual_overrides.push({
                        name: compNameRes.rows[0].name,
                        amount: o.amount,
                        reason: o.reason
                    });
                }
            }
            result.push(comparison);
        }

        console.log(JSON.stringify(result, null, 2));

        console.log('\n--- Deep Payroll Audit: Performance Integration ---');
        const perfRes = await db.query(`
            SELECT pma.employee_id, u.name, pma.total_amount, pma.month
            FROM performance_monthly_approvals pma
            JOIN employees e ON pma.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE pma.month = '2026-02' AND pma.status = 'Approved'
        `);
        console.log('Performance Approved Amounts:', JSON.stringify(perfRes.rows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAudit();
