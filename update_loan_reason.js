const db = require('./backend/config/db');

async function updateReason() {
    try {
        await db.query(`
      UPDATE employee_loans 
      SET reason = 'Staff Loan Request' 
      WHERE id = 1 AND reason IS NULL
    `);
        console.log('Updated loan reason.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateReason();
