const db = require('./config/db');

async function auditFuel() {
    try {
        console.log("=== EMPLOYEES AND THEIR FUEL QUOTAS ===\n");
        const result = await db.query(`
            SELECT 
                e.id, 
                u.name, 
                e.employment_status,
                (SELECT quantity FROM employee_salary_structure es 
                 JOIN salary_components sc ON es.component_id = sc.id 
                 WHERE es.employee_id = e.id AND sc.name ILIKE '%fuel%' LIMIT 1) as fuel_quantity
            FROM employees e
            JOIN users u ON e.user_id = u.id
            ORDER BY u.name
        `);
        console.table(result.rows);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

auditFuel();
