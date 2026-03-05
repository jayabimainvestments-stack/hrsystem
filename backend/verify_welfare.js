const db = require('./config/db');

async function verifyWelfare() {
    try {
        const month = '2026-02';

        // 1. Sum individual welfare from payroll table
        const payrollRes = await db.query(
            "SELECT id, user_id, welfare, net_salary FROM payroll WHERE month = $1",
            [month]
        );

        console.log(`Payroll records for ${month}:`);
        let calculatedTotal = 0;
        payrollRes.rows.forEach(r => {
            const w = parseFloat(r.welfare || 0);
            calculatedTotal += w;
            console.log(`- ID: ${r.id}, User: ${r.user_id}, Welfare: ${w}`);
        });
        console.log(`\nCalculated Total Welfare: LKR ${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);

        // 2. Check payroll_liabilities table
        const liabRes = await db.query(
            "SELECT * FROM payroll_liabilities WHERE month = $1 AND type = 'Welfare 2%'",
            [month]
        );

        if (liabRes.rows.length > 0) {
            const liab = liabRes.rows[0];
            console.log(`\nLiability Record:`);
            console.log(`- Type: ${liab.type}`);
            console.log(`- Total Payable: LKR ${parseFloat(liab.total_payable).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
            console.log(`- Paid: LKR ${parseFloat(liab.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
            console.log(`- Status: ${liab.status}`);
        } else {
            console.log(`\nNo liability record found for 'Welfare 2%' in ${month}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyWelfare();
