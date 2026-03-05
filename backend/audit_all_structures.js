const db = require('./config/db');

async function auditStructure() {
    try {
        console.log("=== ALL SALARY COMPONENTS FOR ACTIVE EMPLOYEES ===\n");
        const result = await db.query(`
            SELECT 
                u.name, 
                sc.name as component_name,
                es.amount,
                es.quantity
            FROM employees e
            JOIN users u ON e.user_id = u.id
            JOIN employee_salary_structure es ON e.id = es.employee_id 
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.employment_status = 'Active'
            ORDER BY u.name, sc.name
        `);
        console.table(result.rows);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

auditStructure();
