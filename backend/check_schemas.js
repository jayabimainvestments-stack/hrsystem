const db = require('./config/db');

(async () => {
    try {
        console.log('=== LEAVES TABLE COLUMNS ===');
        const l = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leaves' ORDER BY ordinal_position");
        l.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        console.log('\n=== EMPLOYEES TABLE COLUMNS ===');
        const e = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position");
        e.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        console.log('\n=== ATTENDANCE TABLE COLUMNS ===');
        const a = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance' ORDER BY ordinal_position");
        a.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    } catch (e) { console.log('Error:', e.message); }
    finally { process.exit(); }
})();
