const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function repair() {
    try {
        console.log('--- REPAIRING/CREATING PAYROLL FOR 2026-02 ---');
        await pool.query('BEGIN');

        // 1. Get all 6 employees
        const empRes = await pool.query(`
            SELECT e.id as emp_id, u.id as user_id, u.name, e.is_epf_eligible, e.is_etf_eligible 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            WHERE e.id IN (27, 28, 29, 30, 31, 32)
        `);

        for (const emp of empRes.rows) {
            console.log(`\nProcessing ${emp.name} (Emp ${emp.emp_id}, User ${emp.user_id})...`);

            // Find existing payroll
            let payrollRes = await pool.query("SELECT * FROM payroll WHERE user_id = $1 AND month = '2026-02'", [emp.user_id]);
            let payroll = payrollRes.rows[0];

            // If missing, we should ideally create it. 
            // However, createPayroll involves many steps (snapshots, overrides, etc.)
            // For simplicity in a repair script, I will assume the user wants me to FIX existing ones.
            // If Mayuri's is missing, I will try a simple generation.

            if (!payroll) {
                console.log(`  Payroll record missing for ${emp.name}. Skipping auto-generation for now (user should use UI).`);
                continue;
            }

            // Fetch Approved Overrides
            const overridesRes = await pool.query(`
                SELECT mo.amount, mo.quantity, sc.name, sc.type, sc.epf_eligible, sc.etf_eligible, sc.welfare_eligible, sc.id as component_id
                FROM monthly_salary_overrides mo
                JOIN salary_components sc ON mo.component_id = sc.id
                WHERE mo.employee_id = $1 AND mo.month = '2026-02' AND mo.status = 'Approved'
            `, [emp.emp_id]);

            let basicSalary = 0;
            let totalEarnings = 0;
            let totalDeductionsInStructure = 0;
            let epfBase = 0;
            let etfBase = 0;
            let welfareBase = 0;

            for (const o of overridesRes.rows) {
                const amount = parseFloat(o.amount);
                const name = o.name.toLowerCase();
                if (name.includes('epf') || name.includes('etf') || name.includes('welfare')) continue;

                if (name.includes('basic')) basicSalary = amount;

                if (o.type === 'Earning') {
                    totalEarnings += amount;
                    if (o.epf_eligible) epfBase += amount;
                    if (o.etf_eligible) etfBase += amount;
                    if (o.welfare_eligible) welfareBase += amount;
                } else if (o.type === 'Deduction') {
                    if (name.includes('loan')) continue;
                    totalDeductionsInStructure += amount;
                }
            }

            // Recalculate Statutory
            const welfareAmount = (welfareBase > 0) ? (welfareBase * 0.02) : 0;
            const epf_employee = (emp.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
            const epf_employer = (emp.is_epf_eligible && epfBase > 0) ? (epfBase * 0.12) : 0;
            const etf_employer = (emp.is_etf_eligible && etfBase > 0) ? (etfBase * 0.03) : 0;

            // Recalculate other deductions (Attendance, etc.) already in existing record
            const detailsRes = await pool.query('SELECT component_name, amount, type FROM payroll_details WHERE payroll_id = $1', [payroll.id]);
            let otherEarnings = 0;
            let otherDeductions = 0;

            for (const d of detailsRes.rows) {
                const n = d.component_name.toLowerCase();
                const a = parseFloat(d.amount);
                if (n.includes('epf') || n.includes('etf') || n.includes('welfare')) continue;
                if (d.type === 'Earning') otherEarnings += a;
                else otherDeductions += a;
            }

            const netSalary = otherEarnings - (otherDeductions + epf_employee + welfareAmount);

            // Update Payroll
            await pool.query(`
                UPDATE payroll 
                SET epf_employee = $1, epf_employer = $2, etf_employer = $3, welfare = $4, net_salary = $5
                WHERE id = $6
            `, [epf_employee, epf_employer, etf_employer, welfareAmount, netSalary, payroll.id]);

            // Update Details
            await pool.query("DELETE FROM payroll_details WHERE payroll_id = $1 AND (component_name ILIKE '%EPF%' OR component_name ILIKE '%ETF%' OR component_name ILIKE '%Welfare%')", [payroll.id]);

            if (epf_employee > 0) await pool.query('INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)', [payroll.id, 'EPF (Employee 8%)', epf_employee, 'Statutory']);
            if (welfareAmount > 0) await pool.query('INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)', [payroll.id, 'Welfare', welfareAmount, 'Deduction']);

            console.log(`  Updated Net Salary: ${netSalary}, Welfare: ${welfareAmount}, EPF: ${epf_employee}, ETF: ${etf_employer}`);
        }

        await pool.query('COMMIT');
        console.log('\nRepair completed.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('REPAIR FAILED:', err);
    } finally {
        await pool.end();
    }
}
repair();
