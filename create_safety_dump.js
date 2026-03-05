const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const pgBin = path.join(__dirname, 'pgsql', 'bin', 'pg_dump.exe');
const outFile = path.join(__dirname, 'database_backup_safety.sql');
const dbName = 'hrms';

console.log(`Starting safety backup for ${dbName}...`);

exec(`"${pgBin}" -U postgres -d ${dbName} -f "${outFile}"`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup failed: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Status: ${stderr}`);
    }
    console.log(`✓ Safety backup created: ${outFile}`);
    process.exit();
});
