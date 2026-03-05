const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://postgres:123456@localhost:5432/hr_db'
});

const verify = async () => {
    try {
        console.log('--- Verifying Expanded Welfare Calculation Logic ---');

        // 1. Check flags
        const flagRes = await pool.query(`
            SELECT name, epf_eligible, etf_eligible, welfare_eligible 
            FROM salary_components 
            WHERE name = 'Basic Salary' OR name LIKE 'Budgetary Allowance%'
        `);
        console.log('Component Flags:');
        console.table(flagRes.rows);

        // 2. Check structure for NIC 801285392V (D M K M Dissanayake)
        const structRes = await pool.query(`
            SELECT sc.name, es.amount, sc.type, sc.welfare_eligible
            FROM employee_salary_structure es
            JOIN employees e ON es.employee_id = e.id
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.nic_passport = '801285392V'
        `);

        console.log('\nSalary Structure for 801285392V:');
        console.table(structRes.rows);

        let welfareBase = 0;
        structRes.rows.forEach(r => {
            if (r.welfare_eligible) welfareBase += parseFloat(r.amount);
        });

        console.log(`\nTotal Welfare Base: ${welfareBase}`);
        console.log(`Expected Welfare (3%): ${welfareBase * 0.03}`);

        // Basic: 26500
        // Budgetary 1: 1000
        // Budgetary 2: 2500
        // Total: 30000
        // 3% of 30000 = 900

        if (welfareBase === 30000) {
            console.log('✅ Welfare Base calculation is CORRECT (30,000)');
        } else {
            console.error(`❌ ERROR: Welfare Base mismatch. Expected 30,000, got ${welfareBase}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
