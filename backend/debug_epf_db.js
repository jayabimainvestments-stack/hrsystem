require('dotenv').config();
const db = require('./config/db');

async function debugEpf() {
    try {
        console.log("--- Employee EPF Eligibility ---");
        const employees = await db.query(`
            SELECT e.id, e.user_id, u.name, e.is_epf_eligible 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
        `);
        console.table(employees.rows);

        console.log("\n--- Payroll Records (Statutory Columns) ---");
        const payroll = await db.query(`
            SELECT p.id, u.name, p.month, p.epf_employee, p.epf_employer, p.etf_employer, p.net_salary
            FROM payroll p
            JOIN users u ON p.user_id = u.id
        `);
        console.table(payroll.rows);

        console.log("\n--- Payroll Details (Components) ---");
        const details = await db.query(`
            SELECT pd.payroll_id, pd.component_name, pd.amount 
            FROM payroll_details pd
            WHERE pd.component_name LIKE '%EPF%' OR pd.component_name LIKE '%ETF%'
        `);
        console.table(details.rows);

        process.exit(0);
    } catch (error) {
        console.error("Debug Failed:", error);
        process.exit(1);
    }
}

debugEpf();
