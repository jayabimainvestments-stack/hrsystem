const db = require('./config/db');

const addWelfareFlag = async () => {
    try {
        console.log('Adding welfare_eligible column to salary_components...');

        // 1. Add the column if it doesn't exist
        await db.query(`
            ALTER TABLE salary_components 
            ADD COLUMN IF NOT EXISTS welfare_eligible BOOLEAN DEFAULT false
        `);
        console.log('✅ Column added successfully');

        // 2. Set eligibility for key components
        console.log('Updating eligibility for Basic Salary and Budgetary Allowances...');
        await db.query(`
            UPDATE salary_components 
            SET welfare_eligible = true, 
                epf_eligible = true, 
                etf_eligible = true 
            WHERE name = 'Basic Salary' OR name LIKE 'Budgetary Allowance%'
        `);
        console.log('✅ Eligibility flags updated for key components');

        // 3. Ensure other deduction-like or non-eligible components are false (just in case)
        await db.query(`
            UPDATE salary_components 
            SET welfare_eligible = false 
            WHERE name = 'Welfare' OR type = 'Deduction'
        `);
        console.log('✅ Deduction components marked as welfare-ineligible');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

addWelfareFlag();
