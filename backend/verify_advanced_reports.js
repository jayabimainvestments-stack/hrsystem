require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

async function check() {
    let userId, payrollId;
    try {
        console.log("Checking for Approved Payrolls...");
        let res = await db.query("SELECT id, month, status FROM payroll WHERE status = 'Approved'");

        if (res.rows.length === 0) {
            console.log("No approved payrolls found. Seeding mock data...");

            // 1. Create User
            const userRes = await db.query(`
                INSERT INTO users (name, email, password, role) 
                VALUES ('Report Tester', 'report@test.com', 'hash', 'Employee') 
                RETURNING id
            `);
            userId = userRes.rows[0].id;

            // 2. Create Employee
            await db.query(`
                INSERT INTO employees (user_id, employee_id, designation, epf_no) 
                VALUES ($1, 'RPT001', 'Tester', 'PF123')
            `, [userId]);

            // 3. Create Approved Payroll
            const payRes = await db.query(`
                INSERT INTO payroll (user_id, month, basic_salary, allowances, deductions, net_salary, status, epf_employee, epf_employer, etf_employer) 
                VALUES ($1, '2024-Test', 50000, 10000, 4000, 56000, 'Approved', 4000, 6000, 1500) 
                RETURNING id
            `, [userId]);
            payrollId = payRes.rows[0].id;

            // 4. Create Payroll Details
            await db.query(`
                INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES 
                ($1, 'Basic Salary', 50000, 'Earning'),
                ($1, 'Budgetary Relief', 10000, 'Earning'),
                ($1, 'Overtime', 5000, 'Earning'),
                ($1, 'EPF (Employee)', 4000, 'Deduction'),
                ($1, 'Income Tax (PAYE)', 1000, 'Deduction')
            `, [payrollId]);

            console.log("Mock Data Seeded. Re-checking...");
            res = await db.query("SELECT id, month, status FROM payroll WHERE status = 'Approved'");
        }

        console.table(res.rows);

        if (res.rows.length > 0) {
            const month = res.rows[0].month;
            console.log(`\nVerifying Journal Data for ${month}...`);
            const journalRes = await db.query(`
                SELECT p.*, u.name as employee_name
                FROM payroll p
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1 AND p.status = 'Approved'
            `, [month]);
            console.log(`Found ${journalRes.rows.length} records for JournalQuery.`);

            // Run the actual aggregation logic helper (simplified)
            let totalBasic = 0;
            for (const row of journalRes.rows) {
                totalBasic += parseFloat(row.basic_salary);
            }
            console.log(`Total Basic for Journal: ${totalBasic}`);

            console.log(`\nVerifying Consolidated Data for ${month}...`);
            const summaryRes = await db.query(`
                SELECT p.*, u.name as employee_name
                FROM payroll p
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1 AND p.status = 'Approved'
            `, [month]);
            console.log(`Found ${summaryRes.rows.length} records for ConsolidatedQuery.`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (userId) {
            console.log("Cleaning up mock data...");
            if (payrollId) {
                await db.query('DELETE FROM payroll_details WHERE payroll_id = $1', [payrollId]);
                await db.query('DELETE FROM payroll WHERE id = $1', [payrollId]);
            }
            await db.query('DELETE FROM employees WHERE user_id = $1', [userId]);
            await db.query('DELETE FROM users WHERE id = $1', [userId]);
            console.log("Cleanup complete.");
        }
        process.exit(0);
    }
}

check();
