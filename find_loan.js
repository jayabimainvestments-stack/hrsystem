const db = require('./backend/config/db');

async function findLoan() {
    try {
        const res = await db.query(`
      SELECT l.*, u.name as employee_name
      FROM employee_loans l
      JOIN employees e ON l.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE u.name ILIKE '%NISHSHANKAGE LAHIRU WITHUNGA NISHSHANKA%'
      AND l.status = 'Pending'
    `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findLoan();
