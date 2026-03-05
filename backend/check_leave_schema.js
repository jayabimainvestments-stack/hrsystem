const db = require('./config/db');

(async () => {
    try {
        console.log('--- CHECKING LEAVE_TYPES CONSTRAINTS ---');
        const res = await db.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'leave_types'::regclass
        `);
        console.table(res.rows);

        console.log('\n--- CHECKING LEAVE_TYPES COLUMNS ---');
        const cols = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'leave_types'
        `);
        console.table(cols.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
