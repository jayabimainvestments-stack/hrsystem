const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function importPayroll() {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'jan_payroll_2026.json'));
        const { month, data } = JSON.parse(rawData);

        console.log(`--- Importing Payroll for ${month} ---`);

        for (const entry of data) {
            await db.query('BEGIN');

            // 1. Get User ID
            const userRes = await db.query('SELECT id FROM users WHERE email = $1', [entry.email]);
            if (userRes.rows.length === 0) {
                console.error(`User ${entry.email} not found. Skipping.`);
                await db.query('ROLLBACK');
                continue;
            }
            const userId = userRes.rows[0].id;

            // 2. Get Employee Profile (for EPF eligibility)
            const empRes = await db.query('SELECT is_epf_eligible, is_etf_eligible FROM employees WHERE user_id = $1', [userId]);
            const { is_epf_eligible, is_etf_eligible } = empRes.rows[0] || { is_epf_eligible: true, is_etf_eligible: true };

            // 3. Calculations
            const consolidatedBasic = entry.basic_pay + (entry.budgetary_allowance_1 || 0) + (entry.budgetary_allowance_2 || 0);

            const totalAdditions = (entry.annual_performance || 0) + (entry.monthly_performance || 0) +
                (entry.travelling || 0) + (entry.monthly_fuel || 0) + (entry.motorcycle_maintenance || 0);

            const grossPay = consolidatedBasic + totalAdditions;

            const epf8 = is_epf_eligible ? (consolidatedBasic * 0.08) : 0;
            const epf12 = is_epf_eligible ? (consolidatedBasic * 0.12) : 0;
            const etf3 = is_etf_eligible ? (consolidatedBasic * 0.03) : (consolidatedBasic * 0.03); // Usually 3% regardless? Report shows 900 for all.

            const totalDeductions = epf8 + (entry.salary_advance || 0) + (entry.welfare || 0) + (entry.staff_loan || 0);
            const netSalary = grossPay - totalDeductions;

            console.log(`Processing ${entry.email}: Gross ${grossPay}, Net ${netSalary}`);

            // 4. Insert into payroll table
            const payrollResult = await db.query(
                `INSERT INTO payroll 
                (user_id, month, basic_salary, allowances, bonuses, deductions, net_salary, epf_employee, epf_employer, etf_employer, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
                [userId, month, consolidatedBasic, totalAdditions, 0, totalDeductions, netSalary, epf8, epf12, etf3, 'Approved']
            );
            const payrollId = payrollResult.rows[0].id;

            // 5. Insert details
            const details = [
                { name: 'Basic Pay', amount: entry.basic_pay, type: 'Addition' },
                { name: 'Budgetary Allowance 1', amount: entry.budgetary_allowance_1, type: 'Addition' },
                { name: 'Budgetary Allowance 2', amount: entry.budgetary_allowance_2, type: 'Addition' },
                { name: 'Annual Performance', amount: entry.annual_performance, type: 'Addition' },
                { name: 'Monthly Performance', amount: entry.monthly_performance, type: 'Addition' },
                { name: 'Travelling', amount: entry.travelling, type: 'Addition' },
                { name: 'Monthly Fuel', amount: entry.monthly_fuel, type: 'Addition' },
                { name: 'Motorcycle Maintenance', amount: entry.motorcycle_maintenance, type: 'Addition' },
                { name: 'EPF 8%', amount: epf8, type: 'Deduction' },
                { name: 'Salary Advance', amount: entry.salary_advance, type: 'Deduction' },
                { name: 'Welfare', amount: entry.welfare, type: 'Deduction' },
                { name: 'Staff Loan', amount: entry.staff_loan, type: 'Deduction' }
            ].filter(d => d.amount && d.amount > 0);

            for (const d of details) {
                await db.query(
                    'INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)',
                    [payrollId, d.name, d.amount, d.type]
                );
            }

            await db.query('COMMIT');
        }

        console.log('--- Payroll Import Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error importing payroll:', error);
        process.exit(1);
    }
}

importPayroll();
