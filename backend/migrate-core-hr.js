const db = require('./config/db');

const migrateCoreHR = async () => {
    try {
        console.log('Starting Core HR Expansion Migration...');

        // 1. Departments Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                code VARCHAR(20) UNIQUE,
                head_of_department INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created departments table.');

        // 2. Designations Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS designations (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) UNIQUE NOT NULL,
                department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
                salary_grade VARCHAR(50),
                min_salary DECIMAL(10, 2),
                max_salary DECIMAL(10, 2),
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created designations table.');

        // 3. Employee History Table (Promotions/Transfers)
        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_history (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                action_type VARCHAR(50) NOT NULL, -- Promotion, Transfer, Salary Hike, Role Change
                previous_department VARCHAR(100),
                new_department VARCHAR(100),
                previous_designation VARCHAR(100),
                new_designation VARCHAR(100),
                previous_salary DECIMAL(10, 2),
                new_salary DECIMAL(10, 2),
                reason TEXT,
                changed_by INTEGER REFERENCES users(id),
                change_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created employee_history table.');

        console.log('Core HR Expansion Migration Completed Successfully.');
        process.exit();
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrateCoreHR();
