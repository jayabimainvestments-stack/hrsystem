const db = require('./config/db');

async function addWeekEnding() {
    try {
        console.log('Adding week_ending column to performance_weekly_data...');
        await db.query(`
            ALTER TABLE performance_weekly_data 
            ADD COLUMN IF NOT EXISTS week_ending DATE
        `);

        // Populate existing records with week_ending = week_starting + 6 days
        console.log('Populating week_ending for existing records...');
        await db.query(`
            UPDATE performance_weekly_data 
            SET week_ending = week_starting + INTERVAL '6 days'
            WHERE week_ending IS NULL
        `);

        // Make it NOT NULL for future entries
        await db.query(`
            ALTER TABLE performance_weekly_data 
            ALTER COLUMN week_ending SET NOT NULL
        `);

        console.log('✅ week_ending column added and populated!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

addWeekEnding();
