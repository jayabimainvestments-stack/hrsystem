const fs = require('fs');
const db = require('../config/db');
const path = require('path');

const backupPayroll = async () => {
    try {
        const res = await db.query('SELECT * FROM payroll');
        const liabilities = await db.query('SELECT * FROM payroll_liabilities');

        const backupPath = path.join(__dirname, `../payroll_backup_${Date.now()}.json`);
        const data = {
            payroll: res.rows,
            liabilities: liabilities.rows
        };

        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log(`Backup created at ${backupPath}`);
        console.log(`Payroll records: ${res.rows.length}`);
        console.log(`Liabilities records: ${liabilities.rows.length}`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

backupPayroll();
