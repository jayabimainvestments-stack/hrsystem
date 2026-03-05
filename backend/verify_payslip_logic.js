const { Client } = require('pg');
require('dotenv').config();

async function verifyLahiruPayslipData() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Fetch Lahiru's February payroll (ID 6)
        const payrollRes = await client.query('SELECT * FROM payroll WHERE id = 6');
        const payroll = payrollRes.rows[0];

        console.log('--- Database Record (Payroll) ---');
        console.log(`Basic: ${payroll.basic_salary}`);
        console.log(`Bonuses (Column): ${payroll.bonuses}`);
        console.log(`Allowances (Column): ${payroll.allowances}`);
        console.log(`Net Salary: ${payroll.net_salary}`);

        // Fetch Details
        const detailsRes = await client.query('SELECT * FROM payroll_details WHERE payroll_id = 6');
        const details = detailsRes.rows;

        console.log('\n--- Earnings from Details ---');
        let detailEarningsSum = 0;
        details.filter(d => d.type === 'Earning').forEach(d => {
            console.log(`${d.component_name}: ${d.amount}`);
            detailEarningsSum += parseFloat(d.amount);
        });

        console.log(`\nSum of Detail Earnings: ${detailEarningsSum}`);

        // Simulation of the new PDF logic
        const basicSalary = parseFloat(payroll.basic_salary);
        const bonuses = parseFloat(payroll.bonuses || 0);
        const simulatedTotalEarnings = basicSalary + bonuses;

        console.log(`\nSimulated Total Earnings (Basic + Bonuses): ${simulatedTotalEarnings}`);

        if (Math.abs(simulatedTotalEarnings - (detailEarningsSum + (details.some(d => d.component_name.toLowerCase().includes('basic')) ? 0 : basicSalary))) < 0.01) {
            console.log('\nSUCCESS: Total earnings calculation is consistent with details.');
        } else {
            console.log('\nWARNING: Calculation mismatch between columns and details.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

verifyLahiruPayslipData();
