const db = require('./config/db');

const migratePayroll = async () => {
    try {
        console.log('Starting Advanced Payroll Migration...');

        // 1. Salary Components (Allowances, Deductions)
        await db.query(`
            CREATE TABLE IF NOT EXISTS salary_components (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                type VARCHAR(50) CHECK (type IN ('Earning', 'Deduction', 'Statutory')) NOT NULL,
                is_taxable BOOLEAN DEFAULT TRUE,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created salary_components table.');

        // 2. Tax Brackets
        await db.query(`
            CREATE TABLE IF NOT EXISTS tax_brackets (
                id SERIAL PRIMARY KEY,
                min_income DECIMAL(15, 2) NOT NULL,
                max_income DECIMAL(15, 2), -- NULL means infinity
                tax_rate DECIMAL(5, 2) NOT NULL, -- Percentage
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created tax_brackets table.');

        // 3. Employee Salary Structure (Assign components to employees)
        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_salary_structure (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                component_id INTEGER REFERENCES salary_components(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) DEFAULT 0,
                effective_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, component_id)
            );
        `);
        console.log('Created employee_salary_structure table.');

        // 4. Payroll Details (Breakdown of each payroll record)
        // Note: We need to link this to the main 'payroll' table. 
        // The main payroll table currently has basic_salary, bonuses, etc columns.
        // We will keep the main table for summary, and this for breakdown.
        await db.query(`
            CREATE TABLE IF NOT EXISTS payroll_details (
                id SERIAL PRIMARY KEY,
                payroll_id INTEGER REFERENCES payroll(id) ON DELETE CASCADE,
                component_name VARCHAR(100) NOT NULL, -- Storing name snapshot in case component is deleted
                amount DECIMAL(10, 2) NOT NULL,
                type VARCHAR(50) NOT NULL -- Earning or Deduction
            );
        `);
        console.log('Created payroll_details table.');

        console.log('Advanced Payroll Migration Completed Successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migratePayroll();
