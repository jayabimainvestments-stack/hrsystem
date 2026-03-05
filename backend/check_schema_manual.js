const db = require('./config/db');

async function checkSchema() {
    try {
        const tables = ['employee_salary_structure', 'performance_monthly_approvals', 'performance_weekly_data', 'salary_components'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const res = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            console.log(JSON.stringify(res.rows, null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
