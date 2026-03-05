const db = require('./config/db');

const fixFlags = async () => {
    try {
        console.log('Updating salary component statutory flags...');

        // 1. Salary Advance should NOT be EPF/ETF eligible (it is a post-statutory deduction usually)
        await db.query(`
            UPDATE salary_components 
            SET epf_eligible = false, etf_eligible = false 
            WHERE name = 'Salary Advance'
        `);
        console.log('✅ Updated "Salary Advance" flags to false');

        // 2. Budgetary Allowances are typically EPF/ETF eligible in Sri Lanka
        await db.query(`
            UPDATE salary_components 
            SET epf_eligible = true, etf_eligible = true 
            WHERE name LIKE 'Budgetary Allowance%'
        `);
        console.log('✅ Updated "Budgetary Allowance" flags to true');

        // 3. Welfare is a post-statutory deduction
        await db.query(`
            UPDATE salary_components 
            SET epf_eligible = false, etf_eligible = false 
            WHERE name = 'Welfare'
        `);
        console.log('✅ Updated "Welfare" flags to false');

        console.log('Consistency check completed.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update flags:', error);
        process.exit(1);
    }
};

fixFlags();
