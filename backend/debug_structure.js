const db = require('./config/db');

async function debug() {
    try {
        const empId = 2; // Testing for the first employee
        console.log(`--- Debugging Employee ID: ${empId} ---`);

        const structureRes = await db.query(`
            SELECT es.component_id, es.amount, es.quantity, es.installments_remaining, sc.name, sc.type
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
        `, [empId]);

        console.log(`Rows found in structure: ${structureRes.rows.length}`);
        structureRes.rows.forEach(r => console.log(` - ${r.name}: ${r.amount}`));

        const empRes = await db.query('SELECT user_id FROM employees WHERE id = $1', [empId]);
        console.log(`Employee exists: ${empRes.rows.length > 0}`);
        if (empRes.rows.length > 0) {
            console.log(`User ID: ${empRes.rows[0].user_id}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
