const db = require('../config/db');

const monthMap = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

(async () => {
    try {
        console.log('--- MIGRATING PAYROLL MONTH FORMAT ---');

        const res = await db.query("SELECT id, month FROM payroll WHERE month NOT LIKE '____-__'");
        console.log(`Found ${res.rows.length} records to migrate.`);

        for (const row of res.rows) {
            const mName = row.month;
            const mNum = monthMap[mName];

            if (mNum) {
                // assume 2026 for now as per system time
                const newMonth = `2026-${mNum}`;
                await db.query("UPDATE payroll SET month = $1 WHERE id = $2", [newMonth, row.id]);
                console.log(`Updated ID ${row.id}: ${mName} -> ${newMonth}`);

                // Also update liabilities if they use month
                await db.query("UPDATE payroll_liabilities SET month = $1 WHERE month = $2", [newMonth, mName]);
            } else {
                console.warn(`Skipping ID ${row.id}: Unknown month format '${mName}'`);
            }
        }

        console.log('--- MIGRATION COMPLETE ---');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
