const db = require('./backend/config/db');

async function checkOrphaned() {
    try {
        const res = await db.query(`
            SELECT DISTINCT component_id 
            FROM employee_salary_structure 
            WHERE component_id NOT IN (SELECT id FROM salary_components)
        `);
        console.log('Orphaned component IDs in employee_salary_structure:');
        console.log(JSON.stringify(res.rows, null, 2));

        const res2 = await db.query('SELECT COUNT(*) FROM employee_salary_structure');
        console.log('Total structures:', res2.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrphaned();
