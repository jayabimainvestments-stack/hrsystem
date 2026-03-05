const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function generateAuditReport() {
    try {
        console.log('--- STATUTORY CALCULATION AUDIT (FEBRUARY 2026) ---');

        // 1. Get all payroll records for Feb 2026
        const payrolls = await pool.query(`
            SELECT p.id, p.user_id, u.name, p.basic_salary, p.epf_employee, p.epf_employer, p.etf_employer, p.welfare,
                   e.is_epf_eligible, e.is_etf_eligible
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            JOIN employees e ON p.user_id = e.user_id
            WHERE p.month = '2026-02'
        `);

        console.log('\nINDIVIDUAL BREAKDOWN:');
        console.table(payrolls.rows.map(p => ({
            Employee: p.name,
            'EPF Elig': p.is_epf_eligible,
            'ETF Elig': p.is_etf_eligible,
            'Basic Salary': parseFloat(p.basic_salary),
            'EPF 8% (Emp)': parseFloat(p.epf_employee),
            'EPF 12% (Co)': parseFloat(p.epf_employer),
            'ETF 3% (Co)': parseFloat(p.etf_employer),
            'Welfare 2%': parseFloat(p.welfare)
        })));

        // 2. Summary Totals (Matching Compliance View)
        let totalEPF8 = 0;
        let totalEPF12 = 0;
        let totalETF3 = 0;
        let totalWelfare = 0;

        payrolls.rows.forEach(p => {
            totalEPF8 += parseFloat(p.epf_employee);
            totalEPF12 += parseFloat(p.epf_employer);
            totalETF3 += parseFloat(p.etf_employer);
            totalWelfare += parseFloat(p.welfare);
        });

        console.log('\n--- TOTALS (Compliance View) ---');
        console.log(`EPF 8%: LKR ${totalEPF8.toLocaleString()}`);
        console.log(`EPF 12%: LKR ${totalEPF12.toLocaleString()}`);
        console.log(`ETF 3%: LKR ${totalETF3.toLocaleString()}`);
        console.log(`Welfare 2%: LKR ${totalWelfare.toLocaleString()}`);

        console.log('\n--- CALCULATION LOGIC APPLIED ---');
        console.log('EPF/Welfare Base: Sum of "EPF Eligible" earnings for eligible employees.');
        console.log('ETF Base: Sum of "ETF Eligible" earnings for eligible employees.');
        console.log('\nCurrent Component Eligibility Settings:');
        const comps = await pool.query('SELECT name, epf_eligible, etf_eligible, welfare_eligible FROM salary_components WHERE epf_eligible OR etf_eligible OR welfare_eligible');
        console.table(comps.rows);

    } catch (err) {
        console.error('AUDIT ERROR:', err);
    } finally {
        await pool.end();
    }
}

generateAuditReport();
