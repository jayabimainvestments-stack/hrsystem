const db = require('./config/db');

(async () => {
    try {
        console.log('--- VERIFYING DATA ---');

        const payrolls = await db.query(`
            SELECT u.name, p.basic_salary, p.bonuses, p.deductions, p.net_salary, p.epf_employee, p.welfare
            FROM payroll p JOIN users u ON p.user_id = u.id
            WHERE p.month = '2026-01'
        `);
        console.table(payrolls.rows);

        const empDetails = await db.query(`
            SELECT u.name, e.nic_passport, e.department, e.designation, e.bank_details
            FROM employees e JOIN users u ON e.user_id = u.id
        `);
        console.table(empDetails.rows);

        const liabilities = await db.query("SELECT * FROM payroll_liabilities WHERE month = '2026-01'");
        console.table(liabilities.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
