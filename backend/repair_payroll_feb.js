const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function repairPayroll() {
    try {
        console.log('--- Repairing Payroll Records for 2026-02 ---');
        await pool.query('BEGIN');

        // 1. Get all payroll records for Feb 2026
        const payrolls = await pool.query(`
            SELECT p.id, p.user_id, p.month 
            FROM payroll p 
            WHERE p.month = '2026-02'
        `);

        console.log(`Found ${payrolls.rowCount} records to repair.`);

        for (const p of payrolls.rows) {
            console.log(`Processing Payroll ID ${p.id} (User ${p.user_id})...`);

            // 2. Fetch all Approved components for this month to recalculate
            const componentsRes = await pool.query(`
                SELECT 
                    mo.amount, 
                    mo.quantity, 
                    sc.name, 
                    sc.type, 
                    sc.epf_eligible,
                    sc.etf_eligible,
                    sc.welfare_eligible
                FROM monthly_salary_overrides mo
                JOIN salary_components sc ON mo.component_id = sc.id
                WHERE mo.employee_id = (SELECT id FROM employees WHERE user_id = $1) 
                AND mo.month = $2 AND mo.status = 'Approved'
            `, [p.user_id, p.month]);

            const components = componentsRes.rows;
            const empRes = await pool.query('SELECT is_epf_eligible, is_etf_eligible FROM employees WHERE user_id = $1', [p.user_id]);
            const employee = empRes.rows[0];

            let basicSalary = 0;
            let totalEarnings = 0;
            let totalDeductionsInStructure = 0;
            let epfBase = 0;
            let etfBase = 0;
            let welfareBase = 0;

            for (const comp of components) {
                const amount = parseFloat(comp.amount);
                const compName = comp.name.toLowerCase();

                if (compName.includes('epf') || compName.includes('etf') || compName.includes('welfare')) continue;

                if (compName.includes('basic')) basicSalary = amount;

                if (comp.type === 'Earning') {
                    totalEarnings += amount;
                    if (comp.epf_eligible) epfBase += amount;
                    if (comp.etf_eligible) etfBase += amount;
                    if (comp.welfare_eligible) welfareBase += amount;
                } else if (comp.type === 'Deduction') {
                    if (compName.includes('loan')) continue;
                    totalDeductionsInStructure += amount;
                }
            }

            // Simple re-calc for repair
            const welfareAmount = (employee.is_epf_eligible && welfareBase > 0) ? (welfareBase * 0.02) : 0;
            const epf_employee = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
            const epf_employer = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.12) : 0;
            const etf_employer = (employee.is_etf_eligible && etfBase > 0) ? (etfBase * 0.03) : 0;

            // Recalculate total deductions from details (to catch things like No Pay, etc. that were already calculated)
            const detailsRes = await pool.query('SELECT amount, type FROM payroll_details WHERE payroll_id = $1', [p.id]);
            let total_details_earnings = 0;
            let total_details_deductions = 0;

            // Since we want to FIX the record, we should probably use the NEW values for statutory
            // But keep others. For simplicity, let's just update the top level record based on recalculated statutory.

            // Actually, the most accurate is to sum ALL currently existing details except statutory, 
            // then add our new statutory to it.

            let otherEarnings = 0;
            let otherDeductions = 0;

            for (const d of detailsRes.rows) {
                const name = d.component_name || ''; // Note: column is component_name
                // Wait, I need to fetch the name. The query above didn't select it.
            }
            // Re-fetch with name
            const detailsResDetail = await pool.query('SELECT component_name, amount, type FROM payroll_details WHERE payroll_id = $1', [p.id]);

            for (const d of detailsResDetail.rows) {
                const n = d.component_name.toLowerCase();
                const a = parseFloat(d.amount);
                if (n.includes('epf') || n.includes('etf') || n.includes('welfare')) continue;

                if (d.type === 'Earning') otherEarnings += a;
                else otherDeductions += a;
            }

            const finalEarnings = otherEarnings; // Statutories are deductions anyway
            const finalDeductions = otherDeductions + epf_employee + welfareAmount; // Statutory employee portions
            const netSalary = finalEarnings - finalDeductions;

            await pool.query(`
                UPDATE payroll 
                SET epf_employee = $1, epf_employer = $2, etf_employer = $3, welfare = $4, net_salary = $5
                WHERE id = $6
            `, [epf_employee, epf_employer, etf_employer, welfareAmount, netSalary, p.id]);

            // Update details: Delete old statutory and insert new
            await pool.query(`
                DELETE FROM payroll_details 
                WHERE payroll_id = $1 AND (component_name ILIKE '%EPF%' OR component_name ILIKE '%ETF%' OR component_name ILIKE '%Welfare%')
            `, [p.id]);

            if (epf_employee > 0) await pool.query('INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)', [p.id, 'EPF (Employee 8%)', epf_employee, 'Statutory']);
            if (welfareAmount > 0) await pool.query('INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)', [p.id, 'Welfare', welfareAmount, 'Deduction']);

            console.log(`  Updated Net Salary to ${netSalary}`);
        }

        await pool.query('COMMIT');
        console.log('\nRepair completed successfully.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('REPAIR FAILED:', err);
    } finally {
        await pool.end();
    }
}

repairPayroll();
