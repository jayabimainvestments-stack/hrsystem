const db = require('./config/db');

/**
 * Create employee record for HR Manager
 */

async function createHRManagerEmployee() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("\n=== CREATING EMPLOYEE RECORD FOR HR MANAGER ===\n");

        // Check if HR Manager user exists
        const userRes = await client.query("SELECT * FROM users WHERE email = 'hr@example.com'");
        if (userRes.rows.length === 0) {
            console.log("❌ HR Manager user not found");
            process.exit(1);
        }

        const hrUser = userRes.rows[0];
        console.log(`✅ Found HR Manager user:`);
        console.log(`   ID: ${hrUser.id}`);
        console.log(`   Name: ${hrUser.name}`);
        console.log(`   Email: ${hrUser.email}\n`);

        // Check if employee record already exists
        const empCheck = await client.query("SELECT * FROM employees WHERE user_id = $1", [hrUser.id]);
        if (empCheck.rows.length > 0) {
            console.log("✅ Employee record already exists");
            await client.query('ROLLBACK');
            process.exit(0);
        }

        // Create employee record
        const empRes = await client.query(`
            INSERT INTO employees (
                user_id, 
                designation, 
                department, 
                employment_status,
                hire_date
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            hrUser.id,
            'HR Manager',
            'Human Resources',
            'Active',
            new Date()
        ]);

        console.log("✅ Created employee record:");
        console.log(`   Employee ID: ${empRes.rows[0].id}`);
        console.log(`   Designation: ${empRes.rows[0].designation}`);
        console.log(`   Department: ${empRes.rows[0].department}\n`);

        await client.query('COMMIT');
        console.log("✅ SUCCESS! HR Manager now has an employee record\n");
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n❌ Error:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

createHRManagerEmployee();
