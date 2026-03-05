const db = require('./config/db');

async function checkSchema() {
    try {
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'attendance_policies'
        `);
        console.log('Columns in attendance_policies:');
        result.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
