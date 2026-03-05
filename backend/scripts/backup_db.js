const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const backupDir = path.resolve(__dirname, '../../../../HR_BACKUPS');
const pgDumpPath = path.join(__dirname, '../../pgsql/bin/pg_dump.exe');

async function runBackup() {
    try {
        console.log('--- HRMS DATA BACKUP STARTED ---');

        if (!fs.existsSync(backupDir)) {
            console.log(`Creating backup directory: ${backupDir}`);
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error('DATABASE_URL not found in .env');

        // Parse connection string: postgres://user:pass@host:port/database
        const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
        const match = dbUrl.match(regex);

        if (!match) throw new Error('Invalid DATABASE_URL format');

        const [_, user, password, host, port, database] = match;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFile = path.join(backupDir, `hr_db_backup_${timestamp}.sql`);

        console.log(`Backing up database "${database}" to ${outputFile}...`);

        // Use PGPASSWORD env var to avoid prompt. Avoid space before &&
        const command = `set PGPASSWORD=${password}&& "${pgDumpPath}" -h ${host} -p ${port} -U ${user} -F p -f "${outputFile}" ${database}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Backup Error: ${error.message}`);
                return;
            }
            if (stderr && !stderr.includes('dumping contents')) {
                console.warn(`Backup Warning: ${stderr}`);
            }
            console.log('--- BACKUP COMPLETED SUCCESSFULLY ---');
            console.log(`File: ${outputFile}`);
        });

    } catch (err) {
        console.error('Backup Script Failed:', err.message);
    }
}

runBackup();
