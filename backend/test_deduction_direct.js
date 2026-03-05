const db = require('./config/db');

/**
 * Direct Deduction Calculation Test
 * Calls the deduction calculation logic directly without API authentication
 */

async function testDeductionDirect() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("\n=== TESTING DEDUCTION CALCULATION FOR 2026-02 ===\n");

        const month = '2026-02';

        // 1. Get Policy Rates
        const policyRes = await client.query('SELECT absent_day_amount, late_hourly_rate, work_start_time FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];
        const absentRate = parseFloat(policy.absent_day_amount);
        const lateRate = parseFloat(policy.late_hourly_rate);

        console.log(`⚙️  Policy Settings:`);
        console.log(`   Absent Day Rate: LKR ${absentRate}`);
        console.log(`   Late Hourly Rate: LKR ${lateRate}`);
        console.log(`   Work Start Time: ${policy.work_start_time}\n`);

        // 2. Identify the "No Pay" Component ID
        const compRes = await client.query("SELECT id FROM salary_components WHERE name = 'No Pay'");
        let deductionComponentId;
        if (compRes.rows.length === 0) {
            const newComp = await client.query(
                "INSERT INTO salary_components (name, type, is_taxable) VALUES ('No Pay', 'Deduction', true) RETURNING id"
            );
            deductionComponentId = newComp.rows[0].id;
            console.log(`✅ Created 'No Pay' component (ID: ${deductionComponentId})`);
        } else {
            deductionComponentId = compRes.rows[0].id;
            console.log(`✅ Found 'No Pay' component (ID: ${deductionComponentId})`);
        }

        // Check for Attendance Allowance
        const attAllowRes = await client.query("SELECT id, default_value FROM salary_components WHERE name = 'Attendance Allowance'");
        let attAllowanceId;
        let attAllowanceDefault = 0;

        if (attAllowRes.rows.length === 0) {
            const newComp = await client.query(
                "INSERT INTO salary_components (name, type, is_taxable, default_value) VALUES ('Attendance Allowance', 'Earning', true, '0') RETURNING id"
            );
            attAllowanceId = newComp.rows[0].id;
            console.log(`✅ Created 'Attendance Allowance' component (ID: ${attAllowanceId})\n`);
        } else {
            attAllowanceId = attAllowRes.rows[0].id;
            attAllowanceDefault = parseFloat(attAllowRes.rows[0].default_value || 0);
            console.log(`✅ Found 'Attendance Allowance' component (ID: ${attAllowanceId}, Default: LKR ${attAllowanceDefault})\n`);
        }

        // 3. Get all active employees
        const empRes = await client.query(`
            SELECT e.id, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.employment_status = 'Active'
        `);
        const employees = empRes.rows;

        let processedCount = 0;
        let totalDeductionValue = 0;
        const report = [];

        console.log(`👥 Processing ${employees.length} employees...\n`);

        for (const emp of employees) {
            const startDate = `${month}-01`;
            const [year, m] = month.split('-');
            const lastDay = new Date(year, m, 0).getDate();
            const endDate = `${month}-${lastDay}`;

            // Fetch Absent Days
            const absentRes = await client.query(`
                SELECT COUNT(*) as count 
                FROM attendance 
                WHERE employee_id = $1 
                AND date >= $2 AND date <= $3 
                AND status = 'Absent'
            `, [emp.id, startDate, endDate]);

            let absentDays = parseInt(absentRes.rows[0].count);

            // Fetch Approved Unpaid Leave Days
            const leaveRes = await client.query(`
                SELECT COALESCE(SUM(unpaid_days), 0) as total_unpaid
                FROM leaves
                WHERE user_id = (SELECT user_id FROM employees WHERE id = $1)
                AND status = 'Approved'
                AND (
                    (start_date >= $2 AND start_date <= $3)
                    OR (end_date >= $2 AND end_date <= $3)
                )
            `, [emp.id, startDate, endDate]);

            const unpaidLeaveDays = parseFloat(leaveRes.rows[0].total_unpaid);
            const totalAbsentDays = absentDays + unpaidLeaveDays;

            // Fetch Late Hours
            const lateRes = await client.query(`
                SELECT SUM(EXTRACT(EPOCH FROM (clock_in - $1::time)) / 3600) as hours
                FROM attendance
                WHERE employee_id = $2
                AND date >= $3 AND date <= $4
                AND clock_in > $1::time
                AND status IN ('Present', 'Late')
            `, [policy.work_start_time, emp.id, startDate, endDate]);

            const lateHours = parseFloat(lateRes.rows[0].hours || 0);

            // Calculate Total Potential Deduction
            let potentialDeduction = (totalAbsentDays * absentRate) + (lateHours * lateRate);

            // Check Employee's Attendance Allowance
            const allowRes = await client.query(
                'SELECT amount FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                [emp.id, attAllowanceId]
            );

            const allowanceAmount = allowRes.rows.length > 0 ? parseFloat(allowRes.rows[0].amount) : attAllowanceDefault;

            // Cap Deduction at Allowance Amount
            const deductionAmount = Math.min(potentialDeduction, allowanceAmount);

            report.push({
                employee_name: emp.name,
                absent_days: totalAbsentDays,
                late_hours: lateHours.toFixed(2),
                potential_deduction: potentialDeduction.toFixed(2),
                attendance_allowance: allowanceAmount.toFixed(2),
                actual_deduction: deductionAmount.toFixed(2),
                capped: potentialDeduction > allowanceAmount ? 'YES' : 'NO'
            });

            if (deductionAmount > 0) {
                processedCount++;
                totalDeductionValue += deductionAmount;
            }
        }

        await client.query('ROLLBACK'); // Don't actually save changes

        console.log("✅ CALCULATION COMPLETE!\n");
        console.log("📊 Summary:");
        console.log(`   Employees with Deductions: ${processedCount}/${employees.length}`);
        console.log(`   Total Deduction Value: LKR ${totalDeductionValue.toFixed(2)}\n`);

        console.log("📋 Detailed Report:");
        console.table(report);

        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

testDeductionDirect();
