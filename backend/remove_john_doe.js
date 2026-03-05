const db = require('./config/db');

async function removeJohnDoe() {
    try {
        console.log('--- Removing Test Employee: John Doe ---');

        // Find user ID for John Doe
        const userRes = await db.query("SELECT id FROM users WHERE email = 'john@example.com'");

        if (userRes.rows.length === 0) {
            console.log('John Doe not found in the database.');
            process.exit(0);
        }

        const userId = userRes.rows[0].id;
        console.log(`Found John Doe with User ID: ${userId}`);

        // Find employee ID
        const empRes = await db.query("SELECT id FROM employees WHERE user_id = $1", [userId]);
        const empId = empRes.rows.length > 0 ? empRes.rows[0].id : null;
        if (empId) console.log(`Found Employee ID: ${empId}`);

        await db.query('BEGIN');

        // delete payroll_details
        await db.query('DELETE FROM payroll_details WHERE payroll_id IN (SELECT id FROM payroll WHERE user_id = $1)', [userId]);
        // delete payroll
        await db.query('DELETE FROM payroll WHERE user_id = $1', [userId]);

        // delete salary structure (uses employee_id)
        if (empId) {
            await db.query('DELETE FROM employee_salary_structure WHERE employee_id = $1', [empId]);
        }

        // delete other related records
        await db.query('DELETE FROM employee_bank_details WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM employees WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        await db.query('COMMIT');

        console.log('John Doe successfully removed from the system.');
        process.exit(0);
    } catch (error) {
        if (db.query) await db.query('ROLLBACK');
        console.error('Error removing John Doe:', error);
        process.exit(1);
    }
}

removeJohnDoe();
