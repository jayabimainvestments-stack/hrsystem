const db = require('./config/db');

async function testGetStructure() {
    try {
        const employeeId = 2; // Assuming ID 2 exists from previous list
        console.log(`Fetching structure for Employee ${employeeId}...`);

        // 1. Get existing specific overrides
        const structureRes = await db.query(`
            SELECT es.component_id, es.amount, sc.name, sc.type
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
        `, [employeeId]);

        console.log("Structure Rows:", structureRes.rows);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testGetStructure();
