const db = require('./config/db');
async function checkSchema() {
    try {
        const tables = ['employees', 'attendance', 'payroll_details', 'leaves', 'employee_loans', 'performance_weekly_data'];
        console.log('--- DATABASE SCHEMA ANALYSIS ---');
        for (const t of tables) {
            const res = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${t}' 
                ORDER BY ordinal_position
            `);
            console.log(`\nTable: ${t}`);
            console.table(res.rows);
        }

        // Also check if there's a specific "code" field in employees
        const empCols = await db.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'employees' AND (column_name ILIKE '%code%' OR column_name ILIKE '%no%' OR column_name ILIKE '%nic%' OR column_name ILIKE '%biometric%')
        `);
        console.log('\nPotential Identifier Columns in employees:');
        console.table(empCols.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
