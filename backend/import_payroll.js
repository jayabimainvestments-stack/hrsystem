const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const importPayroll = async () => {
    try {
        const dataPath = path.join(__dirname, 'payroll_data.json');
        if (!fs.existsSync(dataPath)) {
            console.error('payroll_data.json not found!');
            process.exit(1);
        }

        const payrollData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`Loaded ${payrollData.length} records.`);

        for (const record of payrollData) {
            // Find User ID
            const empRes = await db.query("SELECT user_id, id FROM employees WHERE nic_passport = $1", [record.nic]);

            if (empRes.rows.length === 0) {
                console.error(`Employee with NIC ${record.nic} not found. Skipping.`);
                continue;
            }

            const userId = empRes.rows[0].user_id;

            // Calculate Totals
            const totalAllowances = record.allowances.reduce((sum, item) => sum + item.amount, 0);
            const totalDeductionsBreakdown = record.deductions.reduce((sum, item) => sum + item.amount, 0);

            // Note: Data shows EPF 8% is separate from the "Deductions" column often, but my JSON structure might have put it in or out.
            // Let's sum everything designated as a deduction.
            // In my JSON, "epf_8" is separate property in some, but I also added "BPF 8%" to deductions array for some.
            // I need to be consistent. 
            // Let's check the JSON again in my mind. 
            // Row 4: "BPF 8%" is in deductions array.
            // Row 1: "epf_8": 0.
            // So I should just sum `record.deductions`.

            const totalDeductions = totalDeductionsBreakdown; // + record.epf_8 if not in array

            // Wait, I put epf_8 separately in JSON for some reason?
            // "epf_8": 2400 is at top level in JSON for Row 4, AND "BPF 8%" in deductions. Double counting?
            // Ah, looking at my JSON construction step 257:
            // Row 4: deductions: [ ... {name: "BPF 8%", amount: 2400}, ...], epf_8: 2400.
            // Yes, duplicate. I should rely on the `deductions` array if I populated it.
            // I will ignore the top-level `epf_8` and `etf_3` for the `payroll` table's "deductions" column calculation if they are already in the array.
            // Actually, ETF 3% is an employer contribution, not deducted from employee salary (usually).
            // EPF 8% is employee contribution (deducted).
            // EPF 12% is employer contribution (not deducted).

            // So Total Deductions = sum of objects in `deductions` array.
            // Net salary will be auto-calculated by DB but let's pass it or let DB handle it.
            // The DB schema says: `net_salary ... GENERATED ALWAYS AS ...` 
            // So I only insert basic, bonuses, deductions.

            // Insert into Payroll
            const payrollRes = await db.query(
                `INSERT INTO payroll (user_id, month, basic_salary, bonuses, deductions, status)
                 VALUES ($1, $2, $3, $4, $5, 'Approved')
                 RETURNING id`,
                [userId, record.month, record.basic_salary, totalAllowances, totalDeductions]
            );

            const payrollId = payrollRes.rows[0].id;

            // Insert Details - Allowances
            for (const item of record.allowances) {
                await db.query(
                    `INSERT INTO payroll_details (payroll_id, component_name, amount, type)
                     VALUES ($1, $2, $3, 'Earning')`,
                    [payrollId, item.name, item.amount]
                );
            }

            // Insert Details - Deductions
            for (const item of record.deductions) {
                await db.query(
                    `INSERT INTO payroll_details (payroll_id, component_name, amount, type)
                     VALUES ($1, $2, $3, 'Deduction')`,
                    [payrollId, item.name, item.amount]
                );
            }

            console.log(`Imported payroll for NIC ${record.nic}`);
        }

        console.log('Payroll import completed.');
        process.exit();

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
};

importPayroll();
