const db = require('./config/db');

async function checkPayroll() {
    try {
        const month = '2026-02';
        const result = await db.query(
            "SELECT p.*, e.name as employee_name FROM payroll p LEFT JOIN employees e ON p.employee_id = e.id WHERE p.month = $1",
            [month]
        );
        console.log(`Found ${result.rows.length} payroll records for ${month}:`);
        result.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Employee: ${r.employee_name} (ID: ${r.employee_id}), Net: ${r.net_salary}, Status: ${r.status}`);
        });

        const countRes = await db.query("SELECT COUNT(*) FROM payroll");
        console.log(`\nTotal payroll records in table: ${countRes.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPayroll();
