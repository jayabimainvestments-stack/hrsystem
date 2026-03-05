const db = require('../config/db');

const verifyCount = async () => {
    try {
        const payroll = await db.query('SELECT count(*) FROM payroll');
        const liabilities = await db.query('SELECT count(*) FROM payroll_liabilities');
        console.log(`Payroll Records: ${payroll.rows[0].count}`);
        console.log(`Liabilities Records: ${liabilities.rows[0].count}`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verifyCount();
