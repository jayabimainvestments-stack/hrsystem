const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function backupData() {
    try {
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const tables = ['attendance', 'leaves', 'leave_balances'];

        for (const table of tables) {
            const res = await db.query(`SELECT * FROM ${table}`);
            const filePath = path.join(backupDir, `${table}_backup_${timestamp}.json`);
            fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2));
            console.log(`✅ Backed up ${table} to ${filePath} (${res.rows.length} records)`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    }
}

backupData();
