const db = require('../config/db');

async function testResignationFlow() {
    console.log('--- TEST: Resignation Flow ---');

    try {
        // 1. Setup Employee
        const empRes = await db.query("SELECT id, user_id FROM employees LIMIT 1");
        if (empRes.rows.length === 0) { console.error('No employee found'); return; }
        const employeeId = empRes.rows[0].id;
        const userId = empRes.rows[0].user_id;

        // Clean previous resignations
        await db.query("DELETE FROM resignations WHERE employee_id = $1", [employeeId]);

        // 2. Submit Resignation
        const { submitResignation, updateResignationStatus } = require('../controllers/resignation.controller');

        const reqSubmit = {
            user: { id: userId },
            body: {
                reason: 'Moving to Mars',
                desired_last_day: '2026-01-01'
            }
        };

        let resId;
        const resSubmit = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 201) throw new Error(`Submit failed with ${code}: ${data.message}`);
                    resId = data.id;
                    return data;
                }
            })
        };

        await submitResignation(reqSubmit, resSubmit);
        console.log(`✅ Resignation Submitted. ID: ${resId}`);

        // 3. Attempt to Complete without Clearance (Should Fail)
        const reqComplete = {
            params: { id: resId },
            user: { id: userId, role: 'Admin' }, // Admin action
            body: { status: 'Completed' }
        };

        const resFail = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 400) throw new Error(`Expected 400 for missing clearance, got ${code}`);
                    return data;
                }
            })
        };

        await updateResignationStatus(reqComplete, resFail);
        console.log('✅ Clearance Check Verified (Blocked completion)');

        // 4. Update with Clearances and Complete
        reqComplete.body = {
            status: 'Completed',
            clearance_it: true,
            clearance_finance: true,
            clearance_hr: true,
            exit_interview_notes: 'All good'
        };

        const resSuccess = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 200) throw new Error(`Completion failed with ${code}: ${data.message}`);
                    return data;
                }
            })
        };

        await updateResignationStatus(reqComplete, resSuccess);

        // Verify DB
        const dbCheck = await db.query("SELECT status, clearance_it FROM resignations WHERE id = $1", [resId]);
        if (dbCheck.rows[0].status === 'Completed' && dbCheck.rows[0].clearance_it) {
            console.log('✅ Resignation Completed with Clearances');
        } else {
            throw new Error('DB Status Mismatch');
        }

        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testResignationFlow();
