const db = require('./config/db');

async function simulate() {
    try {
        console.log('--- Payroll Calculation Trace ---');

        // 1. Get Policy
        const policyRes = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        const policy = policyRes.rows[0];
        console.log('Policy Loaded:', {
            absent_day_amount: policy.absent_day_amount,
            late_hourly_rate: policy.late_hourly_rate
        });

        // 2. Mock Data for 1 Day Absence
        const fullUnpaidDays = 1.0;
        const totalLateHours = 0;

        // 3. Perform Calculation (Same logic as payroll.controller.js)
        const absentDeduction = fullUnpaidDays * parseFloat(policy?.absent_day_amount || 0);
        const lateDeduction = totalLateHours * parseFloat(policy?.late_hourly_rate || 0);

        console.log('Inputs:', { fullUnpaidDays, totalLateHours });
        console.log('Results:', { absentDeduction, lateDeduction });

        if (absentDeduction === 2000) {
            console.log('SUCCESS: No-Pay deduction correctly calculated as 2000 LKR.');
        } else {
            console.log('MISMATCH: Expected 2000, got ' + absentDeduction);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
simulate();
