const db = require('../config/db');

async function testEmployeeFlow() {
    console.log('--- TEST: Employee Lifecycle & Governance ---');

    try {
        // 1. Create New Employee
        const uniqueId = Date.now();
        const email = `test.emp.${uniqueId}@example.com`;
        const nic = `NIC${uniqueId}`;

        console.log(`Creating Employee: ${email}`);

        // Mock Controller Call or Direct DB Insert? 
        // Logic is complex in controller (User + Employee + Bank), so testing Controller logic is best.
        // But mocking req/res is tedious.
        // Let's verify the "Sensitive Update" logic specifically, as that's the most complex part.

        // Find an existing employee (or create one quickly via SQL)
        let empId, userId;
        const empRes = await db.query("SELECT id, user_id FROM employees LIMIT 1");

        if (empRes.rows.length > 0) {
            empId = empRes.rows[0].id;
            userId = empRes.rows[0].user_id;
        } else {
            // Create dummy
            // ... skip for brevity, assume seed data exists
            throw new Error('No employees found for test');
        }

        console.log(`Using Employee: ${empId} (User: ${userId})`);

        // 2. Simulate Sensitive Update (e.g. Designation)
        const oldDesgRes = await db.query("SELECT designation FROM employees WHERE id = $1", [empId]);
        const oldDesg = oldDesgRes.rows[0].designation;
        const newDesg = `Senior ${oldDesg}`;

        console.log(`Attempting to change designation from '${oldDesg}' to '${newDesg}'`);

        // We expect this to go to 'pending_changes' table, NOT 'employees' table immediately.

        // Clean up previous pending changes for this test
        await db.query("DELETE FROM pending_changes WHERE entity = 'employees' AND entity_id = $1", [empId]);

        // Mock Request for updateEmployee
        // We need to import the controller
        const { updateEmployee } = require('../controllers/employee.controller');

        const req = {
            params: { id: empId },
            user: { id: userId, role: 'Employee' }, // Self-update or Admin update
            body: {
                designation: newDesg,
                reason: 'Test Promotion'
            }
        };

        const res = {
            status: (code) => {
                return {
                    json: (data) => {
                        // console.log(`Response ${code}:`, data);
                        if (code !== 200) throw new Error(`Update failed: ${data.message}`);
                        return data;
                    }
                };
            }
        };

        await updateEmployee(req, res);

        // 3. Verify Pending Change
        const pendingCheck = await db.query(
            "SELECT * FROM pending_changes WHERE entity = 'employees' AND entity_id = $1 AND field_name = 'designation' AND status = 'Pending'",
            [empId]
        );

        if (pendingCheck.rows.length > 0) {
            console.log('✅ Sensitive Update intercepted: Found in pending_changes');
            console.log('Change Record:', pendingCheck.rows[0].new_value);
        } else {
            console.error('❌ Governance Failed: Sensitive change NOT found in pending_changes');

            // Check if it was applied directly (Double Fail)
            const directCheck = await db.query("SELECT designation FROM employees WHERE id = $1", [empId]);
            if (directCheck.rows[0].designation === newDesg) {
                console.error('❌ CRITICAL: Sensitive change applied DIRECTLY without approval!');
            }
            throw new Error('Governance check failed');
        }

        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testEmployeeFlow();
