const db = require('./config/db');

async function purgeStagingData() {
    try {
        console.log('--- PURGING SALARY DETAILS STAGING DATA ---');
        const res = await db.query('DELETE FROM monthly_salary_overrides');
        console.log(`Success: Deleted ${res.rowCount} rows from monthly_salary_overrides.`);

        // Also clear any linked performance approvals if they exist
        // Note: These tables might not exist or might be needed, but usually overrides are the core of "Salary Details"

        console.log('--- PURGE COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('Purge Failed:', error);
        process.exit(1);
    }
}

purgeStagingData();
