const db = require('./config/db');

async function testQuery() {
    try {
        const result = await db.query(`
            SELECT 
                e.id as id, 
                e.employee_id as string_id, 
                u.name, 
                e.designation,
                es.quantity 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            JOIN employee_salary_structure es ON e.id = es.employee_id 
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE e.employment_status = 'Active'
                AND sc.name ILIKE '%fuel%'
            ORDER BY u.name
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

testQuery();
